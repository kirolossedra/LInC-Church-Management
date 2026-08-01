package com.churchone.backend.service;

import com.churchone.backend.config.BrevoProperties;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class BrevoEmailServiceTest {

    @Test
    void sandboxRequestUsesFixedRecipientAndSandboxHeader() {
        BrevoProperties properties = configuredProperties();
        BrevoGateway gateway = mock(BrevoGateway.class);
        BrevoEmailService service = new BrevoEmailService(properties, gateway);
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(
                Map.class
        );

        when(gateway.send(payloadCaptor.capture()))
                .thenReturn(new BrevoEmailResult("message-id"));

        BrevoEmailResult result = service.sendTestEmail(true);

        assertThat(result.messageId()).isEqualTo("message-id");

        Map<String, Object> payload = payloadCaptor.getValue();
        assertThat(payload.get("to")).isEqualTo(java.util.List.of(Map.of(
                "email", "recipient@example.com",
                "name", "LinC Backend Test"
        )));
        assertThat(payload.get("headers")).isEqualTo(
                Map.of("X-Sib-Sandbox", "drop")
        );
    }

    @Test
    void liveRequestOmitsSandboxHeader() {
        BrevoGateway gateway = mock(BrevoGateway.class);
        BrevoEmailService service = new BrevoEmailService(
                configuredProperties(),
                gateway
        );
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(
                Map.class
        );

        when(gateway.send(payloadCaptor.capture()))
                .thenReturn(new BrevoEmailResult("message-id"));

        service.sendTestEmail(false);

        assertThat(payloadCaptor.getValue()).doesNotContainKey("headers");
    }

    @Test
    void missingConfigurationFailsBeforeProviderCall() {
        BrevoGateway gateway = mock(BrevoGateway.class);
        BrevoEmailService service = new BrevoEmailService(
                new BrevoProperties(),
                gateway
        );

        assertThatThrownBy(() -> service.sendTestEmail(true))
                .isInstanceOf(BrevoConfigurationException.class)
                .hasMessage("The email service is not configured.");

        verifyNoInteractions(gateway);
    }

    private BrevoProperties configuredProperties() {
        BrevoProperties properties = new BrevoProperties();
        properties.setApiKey("test-api-key");
        properties.setSenderEmail("sender@example.com");
        properties.setSenderName("LinC Ministry");
        properties.setTestRecipient("recipient@example.com");
        return properties;
    }
}
