package com.churchone.backend.service;

import com.churchone.backend.security.AuthenticatedFirebaseUser;
import com.churchone.backend.security.VerifiedFirebaseToken;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FirebaseAuthenticationServiceTest {

    private static final VerifiedFirebaseToken VERIFIED_TOKEN =
            new VerifiedFirebaseToken(
                    "firebase-uid",
                    "pastor@example.com",
                    true,
                    "Pastor Name",
                    "https://example.com/picture.png",
                    "password"
            );

    @Test
    void existingFirebaseTokenAndPastorRecordProducePastorSession() {
        FirebaseAuthenticationService service = new FirebaseAuthenticationService(
                token -> VERIFIED_TOKEN,
                new PastorAuthorizationService(email -> "pastor")
        );

        AuthenticatedFirebaseUser user = service.authenticate("existing-id-token");

        assertThat(user.uid()).isEqualTo("firebase-uid");
        assertThat(user.email()).isEqualTo("pastor@example.com");
        assertThat(user.emailVerified()).isTrue();
        assertThat(user.pastor()).isTrue();
    }

    @Test
    void authenticatedNonPastorRemainsAuthenticatedWithoutPastorAuthority() {
        FirebaseAuthenticationService service = new FirebaseAuthenticationService(
                token -> VERIFIED_TOKEN,
                new PastorAuthorizationService(email -> "administrator")
        );

        AuthenticatedFirebaseUser user = service.authenticate("existing-id-token");

        assertThat(user.uid()).isEqualTo("firebase-uid");
        assertThat(user.pastor()).isFalse();
    }
}
