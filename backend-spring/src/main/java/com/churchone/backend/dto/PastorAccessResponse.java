package com.churchone.backend.dto;

public record PastorAccessResponse(
        boolean authorized,
        String uid,
        String email,
        String role
) {
}
