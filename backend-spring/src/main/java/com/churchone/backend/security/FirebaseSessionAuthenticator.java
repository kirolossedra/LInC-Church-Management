package com.churchone.backend.security;

public interface FirebaseSessionAuthenticator {

    AuthenticatedFirebaseUser authenticate(String idToken);
}
