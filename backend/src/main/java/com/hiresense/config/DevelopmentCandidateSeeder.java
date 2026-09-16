package com.hiresense.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

/** Local-only fixture required to exercise the resume upload vertical slice. */
@Configuration
public class DevelopmentCandidateSeeder {
    public static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    public static final UUID CANDIDATE_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Bean
    @ConditionalOnProperty(name = "app.dev-seed.enabled", havingValue = "true")
    CommandLineRunner developmentCandidate(JdbcTemplate jdbcTemplate) {
        return args -> {
            jdbcTemplate.update("""
                INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
                VALUES (?, 'dev.candidate@hiresense.local', 'development-only-not-a-password', 'CANDIDATE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO NOTHING
            """, USER_ID);

            jdbcTemplate.update("""
                INSERT INTO candidate_profiles (id, user_id, first_name, last_name, created_at, updated_at)
                VALUES (?, ?, 'Development', 'Candidate', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO NOTHING
            """, CANDIDATE_ID, USER_ID);
        };
    }
}
