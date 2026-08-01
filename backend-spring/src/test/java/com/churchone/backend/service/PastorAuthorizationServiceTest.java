package com.churchone.backend.service;

import com.churchone.backend.repository.PastorRoleRepository;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class PastorAuthorizationServiceTest {

    @Test
    void exactPastorRoleIsAuthorizedUsingNormalizedEmail() {
        AtomicReference<String> requestedEmail = new AtomicReference<>();
        PastorRoleRepository repository = email -> {
            requestedEmail.set(email);
            return "pastor";
        };
        PastorAuthorizationService service = new PastorAuthorizationService(repository);

        PastorAuthorization result = service.authorize("  Pastor@Example.COM  ");

        assertThat(requestedEmail.get()).isEqualTo("pastor@example.com");
        assertThat(result.authorized()).isTrue();
        assertThat(result.role()).isEqualTo("pastor");
    }

    @Test
    void everyNonPastorValueIsDenied() {
        PastorAuthorizationService service = new PastorAuthorizationService(
                email -> "administrator"
        );

        PastorAuthorization result = service.authorize("member@example.com");

        assertThat(result.authorized()).isFalse();
        assertThat(result.role()).isNull();
    }

    @Test
    void missingEmailIsDeniedWithoutDatabaseLookup() {
        AtomicReference<String> requestedEmail = new AtomicReference<>();
        PastorAuthorizationService service = new PastorAuthorizationService(email -> {
            requestedEmail.set(email);
            return "pastor";
        });

        PastorAuthorization result = service.authorize("  ");

        assertThat(result.authorized()).isFalse();
        assertThat(requestedEmail.get()).isNull();
    }
}
