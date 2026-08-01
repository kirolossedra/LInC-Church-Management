package com.churchone.backend.security;

public record AuthenticatedFirebaseUser(
        String uid,
        String email,
        boolean emailVerified,
        String name,
        String picture,
        String signInProvider,
        boolean pastor
) {
}
