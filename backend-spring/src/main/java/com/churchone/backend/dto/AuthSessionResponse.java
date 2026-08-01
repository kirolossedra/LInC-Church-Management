package com.churchone.backend.dto;

public record AuthSessionResponse(
        boolean authenticated,
        boolean authorized,
        String uid,
        String email,
        boolean emailVerified,
        String name,
        String picture,
        String signInProvider,
        String role,
        String authorizationSource
) {
}
