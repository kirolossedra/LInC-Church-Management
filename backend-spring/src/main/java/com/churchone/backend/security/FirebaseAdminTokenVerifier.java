package com.churchone.backend.security;

import com.churchone.backend.config.FirebaseProperties;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class FirebaseAdminTokenVerifier implements FirebaseTokenVerifier {

    private final ObjectProvider<FirebaseAuth> firebaseAuthProvider;
    private final FirebaseProperties properties;

    public FirebaseAdminTokenVerifier(
            ObjectProvider<FirebaseAuth> firebaseAuthProvider,
            FirebaseProperties properties
    ) {
        this.firebaseAuthProvider = firebaseAuthProvider;
        this.properties = properties;
    }

    @Override
    public VerifiedFirebaseToken verify(String idToken) {
        FirebaseAuth firebaseAuth = firebaseAuthProvider.getIfAvailable();

        if (firebaseAuth == null) {
            throw new FirebaseServiceUnavailableException(
                    "Firebase authentication is not configured on this deployment."
            );
        }

        try {
            FirebaseToken token = firebaseAuth.verifyIdToken(
                    idToken,
                    properties.isCheckRevokedTokens()
            );

            return new VerifiedFirebaseToken(
                    token.getUid(),
                    normalize(token.getEmail()),
                    token.isEmailVerified(),
                    normalize(token.getName()),
                    normalize(token.getPicture()),
                    extractSignInProvider(token.getClaims())
            );
        } catch (FirebaseAuthException | IllegalArgumentException error) {
            throw new InvalidFirebaseTokenException(
                    "The Firebase ID token is invalid or expired.",
                    error
            );
        }
    }

    private String extractSignInProvider(Map<String, Object> claims) {
        Object firebaseClaim = claims.get("firebase");

        if (!(firebaseClaim instanceof Map<?, ?> firebaseValues)) {
            return "";
        }

        Object provider = firebaseValues.get("sign_in_provider");
        return provider == null ? "" : provider.toString().trim();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
