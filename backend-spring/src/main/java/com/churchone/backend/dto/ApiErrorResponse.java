package com.churchone.backend.dto;

import java.time.Instant;

public record ApiErrorResponse(
        boolean success,
        ApiErrorDetails error,
        Instant timestamp
) {
}
