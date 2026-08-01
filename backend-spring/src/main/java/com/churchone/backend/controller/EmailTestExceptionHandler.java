package com.churchone.backend.controller;

import com.churchone.backend.service.BrevoConfigurationException;
import com.churchone.backend.service.BrevoRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice(assignableTypes = EmailTestController.class)
public class EmailTestExceptionHandler {

    @ExceptionHandler({
            EmailTestValidationException.class,
            HttpMessageNotReadableException.class
    })
    ResponseEntity<Map<String, Object>> validationError() {
        return errorResponse(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "The request body is invalid."
        );
    }

    @ExceptionHandler(BrevoConfigurationException.class)
    ResponseEntity<Map<String, Object>> configurationError() {
        return errorResponse(
                HttpStatus.SERVICE_UNAVAILABLE,
                "BREVO_CONFIGURATION_ERROR",
                "The email service is not configured."
        );
    }

    @ExceptionHandler(BrevoRequestException.class)
    ResponseEntity<Map<String, Object>> providerError(
            BrevoRequestException error
    ) {
        return errorResponse(
                HttpStatus.BAD_GATEWAY,
                "BREVO_REQUEST_FAILED",
                error.getMessage()
        );
    }

    private ResponseEntity<Map<String, Object>> errorResponse(
            HttpStatus status,
            String code,
            String message
    ) {
        return ResponseEntity.status(status).body(Map.of(
                "success", false,
                "error", Map.of(
                        "code", code,
                        "message", message
                )
        ));
    }
}
