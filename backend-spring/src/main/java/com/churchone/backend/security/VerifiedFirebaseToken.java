package com.churchone.backend.security;

public record VerifiedFirebaseToken(
        String uid,
        String email,
        boolean emailVerified,
        String name,
        String picture,
        String signInProvider
) {
}
