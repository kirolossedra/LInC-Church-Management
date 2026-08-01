package com.churchone.backend.controller;

import com.churchone.backend.service.BrevoEmailResult;
import com.churchone.backend.service.BrevoGateway;
import com.churchone.backend.service.BrevoRequestException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.firebase.enabled=false",
        "app.brevo.api-key=test-api-key",
        "app.brevo.sender-email=sender@example.com",
        "app.brevo.sender-name=LinC Test Sender",
        "app.brevo.test-recipient=recipient@example.com"
})
@AutoConfigureMockMvc
@Import(EmailTestIntegrationTest.TestBrevoConfiguration.class)
class EmailTestIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TestBrevoGateway gateway;

    @AfterEach
    void resetGateway() {
        gateway.reset();
    }

    @Test
    void publicSandboxRequestReturnsCreatedResponse() throws Exception {
        mockMvc.perform(
                        post("/api/v1/email/test")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {"sandbox":true}
                                        """)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sandbox").value(true))
                .andExpect(jsonPath("$.data.messageId").value("test-message-id"));
    }

    @Test
    void emptyObjectDefaultsToSandbox() throws Exception {
        mockMvc.perform(
                        post("/api/v1/email/test")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}")
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.sandbox").value(true));
    }

    @Test
    void nonBooleanSandboxReturnsValidationError() throws Exception {
        mockMvc.perform(
                        post("/api/v1/email/test")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {"sandbox":"yes"}
                                        """)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void unknownFieldReturnsValidationError() throws Exception {
        mockMvc.perform(
                        post("/api/v1/email/test")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {"sandbox":true,"recipient":"other@example.com"}
                                        """)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void providerFailureReturnsBadGateway() throws Exception {
        gateway.failWith(new BrevoRequestException(
                "Brevo rejected the email request.",
                400
        ));

        mockMvc.perform(
                        post("/api/v1/email/test")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}")
                )
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("BREVO_REQUEST_FAILED"));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestBrevoConfiguration {

        @Bean
        @Primary
        TestBrevoGateway testBrevoGateway() {
            return new TestBrevoGateway();
        }
    }

    static class TestBrevoGateway implements BrevoGateway {

        private BrevoRequestException failure;

        @Override
        public BrevoEmailResult send(Map<String, Object> payload) {
            if (failure != null) {
                throw failure;
            }

            return new BrevoEmailResult("test-message-id");
        }

        void failWith(BrevoRequestException failure) {
            this.failure = failure;
        }

        void reset() {
            this.failure = null;
        }
    }
}
