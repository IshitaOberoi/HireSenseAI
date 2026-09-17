package com.hiresense.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hiresense.model.AiRequestLog;
import com.hiresense.model.Resume;
import com.hiresense.repository.AiRequestLogRepository;
import com.hiresense.repository.ResumeChunkRepository;
import com.hiresense.repository.ResumeRepository;
import com.hiresense.service.ResumeChunkPersistenceService.RetrievedChunk;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeRagService {

    private final ResumeRepository resumeRepository;
    private final ResumeChunkRepository resumeChunkRepository;
    private final ResumeChunkPersistenceService resumeChunkPersistenceService;
    private final AiRequestLogRepository aiRequestLogRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${app.rag.similarity-threshold:0.20}")
    private double similarityThreshold;

    @Value("${app.rag.top-k:4}")
    private int topK;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RagResponse {
        private String answer;
        private String question;
        private List<RetrievedSource> sources;
        private Map<String, Object> metadata;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RetrievedSource {
        private int chunkIndex;
        private String sectionName;
        private String excerpt;
        private double similarity;
    }

    @Transactional
    public RagResponse askQuestion(UUID resumeId, String question) {
        long startTime = System.currentTimeMillis();

        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new IllegalArgumentException("Resume not found with ID: " + resumeId));

        if (!"COMPLETED".equalsIgnoreCase(resume.getProcessingStatus())) {
            throw new IllegalStateException("Resume analysis is not yet completed (current status: " + resume.getProcessingStatus() + ")");
        }

        // Auto-backfill chunks if resume was processed prior to chunking
        ensureChunksExist(resume);

        // 1. Generate 384D query embedding via FastAPI
        List<Double> queryEmbedding = embedQuery(question);

        // 2. Perform pgvector similarity search strictly isolated to this resume_id
        List<RetrievedChunk> candidateChunks = resumeChunkPersistenceService.searchSimilarChunks(
                resumeId, queryEmbedding.toString(), topK
        );

        // 3. Filter chunks by configurable similarity threshold
        List<RetrievedChunk> relevantChunks = candidateChunks.stream()
                .filter(c -> c.getSimilarity() >= similarityThreshold)
                .toList();

        // 4. Send relevant chunks to FastAPI for grounded LLM answer generation
        List<Map<String, Object>> chunksForLlm = relevantChunks.stream()
                .map(c -> Map.<String, Object>of(
                        "section_name", c.getSectionName(),
                        "content", c.getContent(),
                        "similarity", c.getSimilarity()
                ))
                .toList();

        Map<String, Object> ragPayload = Map.of(
                "question", question,
                "chunks", chunksForLlm
        );

        String answerText = "Based on the provided resume excerpts, no relevant information was found to answer this question.";
        String modelName = "unknown";
        int tokensIn = 0;
        int tokensOut = 0;
        int llmLatency = 0;

        try {
            String answerUrl = aiServiceUrl + "/api/ai/rag/answer";
            ResponseEntity<Map> answerResp = restTemplate.postForEntity(answerUrl, ragPayload, Map.class);
            if (answerResp.getStatusCode().is2xxSuccessful() && answerResp.getBody() != null) {
                Map<?, ?> body = answerResp.getBody();
                answerText = getString(body, "text", answerText);
                modelName = getString(body, "model", "groq");
                tokensIn = getInt(body, "tokens_input", 0);
                tokensOut = getInt(body, "tokens_output", 0);
                llmLatency = getInt(body, "latency_ms", 0);
            }
        } catch (Exception e) {
            log.error("Failed to generate RAG answer from AI service", e);
            answerText = "Error communicating with AI service: " + e.getMessage();
        }

        long totalLatency = System.currentTimeMillis() - startTime;

        // 5. Persist audit log in ai_request_logs
        saveRagAuditLog(modelName, totalLatency, tokensIn, tokensOut);

        // 6. Build response with retrieval sources and similarity metadata
        List<RetrievedSource> sources = relevantChunks.stream()
                .map(c -> RetrievedSource.builder()
                        .chunkIndex(c.getChunkIndex())
                        .sectionName(c.getSectionName())
                        .excerpt(truncateExcerpt(c.getContent(), 300))
                        .similarity(Math.round(c.getSimilarity() * 10000.0) / 10000.0)
                        .build())
                .toList();

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("model", modelName);
        metadata.put("total_latency_ms", totalLatency);
        metadata.put("llm_latency_ms", llmLatency);
        metadata.put("tokens_input", tokensIn);
        metadata.put("tokens_output", tokensOut);
        metadata.put("similarity_threshold", similarityThreshold);
        metadata.put("chunks_retrieved", candidateChunks.size());
        metadata.put("chunks_used", relevantChunks.size());

        return RagResponse.builder()
                .answer(answerText)
                .question(question)
                .sources(sources)
                .metadata(metadata)
                .build();
    }

    private void ensureChunksExist(Resume resume) {
        long count = resumeChunkRepository.countByResumeId(resume.getId());
        if (count == 0 && resume.getRawResumeText() != null && !resume.getRawResumeText().isBlank()) {
            log.info("Backfilling resume chunks for resume {}", resume.getId());
            try {
                Map<String, Object> backfillReq = new HashMap<>();
                backfillReq.put("raw_text", resume.getRawResumeText());
                if (resume.getParsedResumeJson() != null && !resume.getParsedResumeJson().isBlank()) {
                    try {
                        backfillReq.put("parsed_json", objectMapper.readValue(resume.getParsedResumeJson(), new TypeReference<Map<String, Object>>() {}));
                    } catch (Exception ignored) {}
                }

                String chunkUrl = aiServiceUrl + "/api/ai/chunk-resume";
                ResponseEntity<Map> chunkResp = restTemplate.postForEntity(chunkUrl, backfillReq, Map.class);
                if (chunkResp.getStatusCode().is2xxSuccessful() && chunkResp.getBody() != null) {
                    List<Map<String, Object>> chunks = (List<Map<String, Object>>) chunkResp.getBody().get("chunks");
                    if (chunks != null && !chunks.isEmpty()) {
                        resumeChunkPersistenceService.saveChunks(resume.getId(), chunks);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to backfill chunks for resume {}", resume.getId(), e);
            }
        }
    }

    private List<Double> embedQuery(String text) {
        try {
            String embedUrl = aiServiceUrl + "/api/ai/embed";
            ResponseEntity<Map> resp = restTemplate.postForEntity(embedUrl, Map.of("text", text), Map.class);
            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                List<?> rawList = (List<?>) resp.getBody().get("embedding");
                if (rawList != null && rawList.size() == 384) {
                    return rawList.stream().map(v -> ((Number) v).doubleValue()).toList();
                }
            }
            throw new IllegalStateException("AI service returned invalid embedding response");
        } catch (Exception e) {
            log.error("Failed to generate embedding for query: '{}'", text, e);
            throw new RuntimeException("Failed to embed query: " + e.getMessage(), e);
        }
    }

    private void saveRagAuditLog(String model, long latencyMs, int tokensIn, int tokensOut) {
        try {
            AiRequestLog requestLog = AiRequestLog.builder()
                    .requestType("RAG")
                    .modelName(model)
                    .latencyMs((int) latencyMs)
                    .tokensInput(tokensIn)
                    .tokensOutput(tokensOut)
                    .calculatedCost(BigDecimal.ZERO)
                    .status("SUCCESS")
                    .errorMessage(null)
                    .build();
            aiRequestLogRepository.save(requestLog);
        } catch (Exception e) {
            log.error("Failed to save RAG audit log", e);
        }
    }

    private String truncateExcerpt(String content, int maxLength) {
        if (content == null) return "";
        if (content.length() <= maxLength) return content;
        return content.substring(0, maxLength).trim() + "...";
    }

    private String getString(Map<?, ?> map, String key, String defaultValue) {
        if (map == null) return defaultValue;
        Object val = map.get(key);
        return val != null ? val.toString() : defaultValue;
    }

    private int getInt(Map<?, ?> map, String key, int defaultValue) {
        if (map == null) return defaultValue;
        Object val = map.get(key);
        return val instanceof Number n ? n.intValue() : defaultValue;
    }
}
