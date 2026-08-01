package com.churchone.backend.security;

import com.churchone.backend.dto.ApiErrorDetails;
import com.churchone.backend.dto.ApiErrorResponse;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;

public class ApiSecurityResponseWriter {

    private final ObjectMapper objectMapper;
    private final Clock clock;

    public ApiSecurityResponseWriter(ObjectMapper objectMapper, Clock clock) {
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public void write(
            HttpServletResponse response,
            int status,
            String code,
            String message
    ) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        objectMapper.writeValue(
                response.getOutputStream(),
                new ApiErrorResponse(
                        false,
                        new ApiErrorDetails(code, message),
                        Instant.now(clock)
                )
        );
    }
}
