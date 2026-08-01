package com.churchone.backend.controller;

import com.churchone.backend.dto.ApiSuccessResponse;
import com.churchone.backend.dto.EmailTestResponse;
import com.churchone.backend.service.BrevoEmailResult;
import com.churchone.backend.service.BrevoEmailService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailTestControllerTest {

    @Test
    void missingSandboxDefaultsToTrue() {
        BrevoEmailService service = mock(BrevoEmailService.class);
        EmailTestController controller = new EmailTestController(service);

        when(service.sendTestEmail(true))
                .thenReturn(new BrevoEmailResult("message-id"));

        ResponseEntity<ApiSuccessResponse<EmailTestResponse>> response =
                controller.sendTestEmail(Map.of());

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isEqualTo(new ApiSuccessResponse<>(
                true,
                new EmailTestResponse(true, "message-id")
        ));
        verify(service).sendTestEmail(true);
    }

    @Test
    void rejectsNonBooleanSandbox() {
        EmailTestController controller = new EmailTestController(
                mock(BrevoEmailService.class)
        );

        assertThatThrownBy(() -> controller.sendTestEmail(Map.of(
                "sandbox", "yes"
        ))).isInstanceOf(EmailTestValidationException.class);
    }

    @Test
    void rejectsUnknownFields() {
        EmailTestController controller = new EmailTestController(
                mock(BrevoEmailService.class)
        );

        assertThatThrownBy(() -> controller.sendTestEmail(Map.of(
                "sandbox", true,
                "recipient", "other@example.com"
        ))).isInstanceOf(EmailTestValidationException.class);
    }
}
