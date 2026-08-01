package com.churchone.backend.service;

import com.churchone.backend.security.AuthenticatedFirebaseUser;
import com.churchone.backend.security.FirebaseSessionAuthenticator;
import com.churchone.backend.security.FirebaseTokenVerifier;
import com.churchone.backend.security.VerifiedFirebaseToken;
import org.springframework.stereotype.Service;

@Service
public class FirebaseAuthenticationService implements FirebaseSessionAuthenticator {

    private final FirebaseTokenVerifier firebaseTokenVerifier;
    private final PastorAuthorizationService pastorAuthorizationService;

    public FirebaseAuthenticationService(
            FirebaseTokenVerifier firebaseTokenVerifier,
            PastorAuthorizationService pastorAuthorizationService
    ) {
        this.firebaseTokenVerifier = firebaseTokenVerifier;
        this.pastorAuthorizationService = pastorAuthorizationService;
    }

    @Override
    public AuthenticatedFirebaseUser authenticate(String idToken) {
        VerifiedFirebaseToken token = firebaseTokenVerifier.verify(idToken);
        PastorAuthorization authorization = pastorAuthorizationService.authorize(
                token.email()
        );

        return new AuthenticatedFirebaseUser(
                token.uid(),
                token.email(),
                token.emailVerified(),
                token.name(),
                token.picture(),
                token.signInProvider(),
                authorization.authorized()
        );
    }
}
