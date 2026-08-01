package com.churchone.backend.dto;

public record ApiSuccessResponse<T>(
        boolean success,
        T data
) {
}
