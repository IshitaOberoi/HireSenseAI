package com.hiresense.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI hireSenseOpenApi() {
        return new OpenAPI().info(new Info().title("HireSense Core API")
                .version("1.0").description("Candidate resumes, job matching, and asynchronous AI processing."));
    }
}
