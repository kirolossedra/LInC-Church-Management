package com.churchone.backend.controller;

import com.churchone.backend.dto.ApiSuccessResponse;
import com.churchone.backend.dto.AuthSessionResponse;
import com.churchone.backend.dto.PastorAccessResponse;
import com.churchone.backend.security.AuthenticatedFirebaseUser;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String AUTHORIZATION_SOURCE =
            "firebase-realtime-database:admins";

    @GetMapping("/session")
    public ResponseEntity<ApiSuccessResponse<AuthSessionResponse>> session(
            Authentication authentication
    ) {
        AuthenticatedFirebaseUser user = authenticatedUser(authentication);

        return ResponseEntity.ok(
                new ApiSuccessResponse<>(
                        true,
                        new AuthSessionResponse(
                                true,
                                user.pastor(),
                                user.uid(),
                                user.email(),
                                user.emailVerified(),
                                user.name(),
                                user.picture(),
                                user.signInProvider(),
                                user.pastor() ? "pastor" : null,
                                AUTHORIZATION_SOURCE
                        )
                )
        );
    }

    @GetMapping("/pastor-access")
    public ResponseEntity<ApiSuccessResponse<PastorAccessResponse>> pastorAccess(
            Authentication authentication
    ) {
        AuthenticatedFirebaseUser user = authenticatedUser(authentication);

        return ResponseEntity.ok(
                new ApiSuccessResponse<>(
                        true,
                        new PastorAccessResponse(
                                true,
                                user.uid(),
                                user.email(),
                                "pastor"
                        )
                )
        );
    }

    private AuthenticatedFirebaseUser authenticatedUser(
            Authentication authentication
    ) {
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AuthenticatedFirebaseUser user)) {
            throw new IllegalStateException(
                    "The authenticated Firebase principal is unavailable."
            );
        }

        return user;
    }
}
