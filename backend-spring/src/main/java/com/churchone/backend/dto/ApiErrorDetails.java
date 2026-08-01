package com.churchone.backend.dto;

public record ApiErrorDetails(
        String code,
        String message
) {
}
