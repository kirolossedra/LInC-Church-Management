package com.churchone.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.firebase.enabled=false")
@AutoConfigureMockMvc
@Import(SecurityIntegrationTest.TestSecurityConfiguration.class)
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthRemainsPublic() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void sessionRequiresExistingFirebaseBearerToken() throws Exception {
        mockMvc.perform(get("/api/v1/auth/session"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void validPastorSessionReturnsCurrentAuthorization() throws Exception {
        mockMvc.perform(
                        get("/api/v1/auth/session")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer pastor-token")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.authenticated").value(true))
                .andExpect(jsonPath("$.data.authorized").value(true))
                .andExpect(jsonPath("$.data.role").value("pastor"));
    }

    @Test
    void authenticatedNonPastorGetsForbiddenFromPastorEndpoint() throws Exception {
        mockMvc.perform(
                        get("/api/v1/auth/pastor-access")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer member-token")
                )
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("PASTOR_ACCESS_REQUIRED"));
    }

    @Test
    void validPastorCanUsePastorEndpoint() throws Exception {
        mockMvc.perform(
                        get("/api/v1/auth/pastor-access")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer pastor-token")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authorized").value(true))
                .andExpect(jsonPath("$.data.role").value("pastor"));
    }

    @Test
    void invalidFirebaseTokenReturnsJsonUnauthorizedResponse() throws Exception {
        mockMvc.perform(
                        get("/api/v1/auth/session")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token")
                )
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_FIREBASE_TOKEN"));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestSecurityConfiguration {

        @Bean
        @Primary
        FirebaseSessionAuthenticator testFirebaseSessionAuthenticator() {
            return token -> switch (token) {
                case "pastor-token" -> new AuthenticatedFirebaseUser(
                        "pastor-uid",
                        "pastor@example.com",
                        true,
                        "Pastor",
                        "",
                        "password",
                        true
                );
                case "member-token" -> new AuthenticatedFirebaseUser(
                        "member-uid",
                        "member@example.com",
                        true,
                        "Member",
                        "",
                        "password",
                        false
                );
                default -> throw new InvalidFirebaseTokenException(
                        "The Firebase ID token is invalid or expired."
                );
            };
        }
    }
}
