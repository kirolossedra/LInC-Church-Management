package com.churchone.backend.controller;

import com.churchone.backend.dto.HealthResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.Instant;

@RestController
public class HealthController {

    private final Clock clock;
    private final String applicationName;
    private final String applicationVersion;

    public HealthController(
            Clock clock,
            @Value("${spring.application.name}") String applicationName,
            @Value("${app.version}") String applicationVersion
    ) {
        this.clock = clock;
        this.applicationName = applicationName;
        this.applicationVersion = applicationVersion;
    }

    @GetMapping({"/", "/health"})
    public ResponseEntity<HealthResponse> health() {
        return ResponseEntity.ok(
                new HealthResponse(
                        "UP",
                        applicationName,
                        applicationVersion,
                        Instant.now(clock)
                )
        );
    }
}
