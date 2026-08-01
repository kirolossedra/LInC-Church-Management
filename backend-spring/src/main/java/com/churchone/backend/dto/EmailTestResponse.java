package com.churchone.backend.dto;

public record EmailTestResponse(
        boolean sandbox,
        String messageId
) {
}
