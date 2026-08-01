package com.churchone.backend.controller;

import com.churchone.backend.dto.ApiSuccessResponse;
import com.churchone.backend.dto.EmailTestResponse;
import com.churchone.backend.service.BrevoEmailResult;
import com.churchone.backend.service.BrevoEmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/email")
public class EmailTestController {

    private static final Set<String> ALLOWED_FIELDS = Set.of("sandbox");

    private final BrevoEmailService emailService;

    public EmailTestController(BrevoEmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/test")
    public ResponseEntity<ApiSuccessResponse<EmailTestResponse>> sendTestEmail(
            @RequestBody(required = false) Map<String, Object> requestBody
    ) {
        Map<String, Object> body = requestBody == null
                ? Map.of()
                : requestBody;

        if (!ALLOWED_FIELDS.containsAll(body.keySet())) {
            throw new EmailTestValidationException();
        }

        Object requestedSandbox = body.get("sandbox");
        boolean sandbox;

        if (requestedSandbox == null) {
            sandbox = true;
        } else if (requestedSandbox instanceof Boolean booleanValue) {
            sandbox = booleanValue;
        } else {
            throw new EmailTestValidationException();
        }

        BrevoEmailResult result = emailService.sendTestEmail(sandbox);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiSuccessResponse<>(
                        true,
                        new EmailTestResponse(sandbox, result.messageId())
                ));
    }
}
