package com.churchone.backend.security;

public interface FirebaseTokenVerifier {

    VerifiedFirebaseToken verify(String idToken);
}
