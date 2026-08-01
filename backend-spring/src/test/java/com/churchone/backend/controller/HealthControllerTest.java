package com.churchone.backend.controller;

import com.churchone.backend.dto.HealthResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class HealthControllerTest {

    private static final Instant FIXED_TIME = Instant.parse("2026-08-01T00:00:00Z");

    @Test
    void healthReturnsStableServiceInformation() {
        HealthController controller = new HealthController(
                Clock.fixed(FIXED_TIME, ZoneOffset.UTC),
                "churchone-spring-backend",
                "0.0.1"
        );

        ResponseEntity<HealthResponse> response = controller.health();

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).isEqualTo(
                new HealthResponse(
                        "UP",
                        "churchone-spring-backend",
                        "0.0.1",
                        FIXED_TIME
                )
        );
    }
}
