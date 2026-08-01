package com.churchone.backend.service;

import com.churchone.backend.config.BrevoProperties;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class JavaHttpBrevoGateway implements BrevoGateway {

    private final BrevoProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public JavaHttpBrevoGateway(
            BrevoProperties properties,
            HttpClient httpClient,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public BrevoEmailResult send(Map<String, Object> payload) {
        String requestBody = writeRequestBody(payload);

        HttpRequest request = HttpRequest.newBuilder(properties.getEndpoint())
                .timeout(properties.effectiveRequestTimeout())
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("api-key", properties.getApiKey())
                .POST(HttpRequest.BodyPublishers.ofString(
                        requestBody,
                        StandardCharsets.UTF_8
                ))
                .build();

        HttpResponse<String> response;

        try {
            response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new BrevoRequestException(
                    "The email provider request was interrupted.",
                    null,
                    error
            );
        } catch (Exception error) {
            throw new BrevoRequestException(
                    "The email provider could not be reached.",
                    null,
                    error
            );
        }

        BrevoProviderResponse providerResponse = readProviderResponse(
                response.body()
        );

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new BrevoRequestException(
                    providerResponse.message() == null
                            ? "Brevo rejected the email request."
                            : providerResponse.message(),
                    response.statusCode()
            );
        }

        return new BrevoEmailResult(providerResponse.messageId());
    }

    private String writeRequestBody(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception error) {
            throw new BrevoRequestException(
                    "The email provider request could not be created.",
                    null,
                    error
            );
        }
    }

    private BrevoProviderResponse readProviderResponse(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return new BrevoProviderResponse(null, null);
        }

        try {
            Map<?, ?> response = objectMapper.readValue(
                    responseBody,
                    Map.class
            );
            return new BrevoProviderResponse(
                    stringValue(response.get("messageId")),
                    stringValue(response.get("message"))
            );
        } catch (Exception ignored) {
            return new BrevoProviderResponse(null, null);
        }
    }

    private String stringValue(Object value) {
        return value instanceof String stringValue ? stringValue : null;
    }

    private record BrevoProviderResponse(
            String messageId,
            String message
    ) {
    }
}
