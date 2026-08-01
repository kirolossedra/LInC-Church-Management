package com.churchone.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "app.brevo")
public class BrevoProperties {

    private static final Duration DEFAULT_REQUEST_TIMEOUT = Duration.ofSeconds(15);

    private String apiKey = "";
    private String senderEmail = "";
    private String senderName = "";
    private String testRecipient = "";
    private URI endpoint = URI.create("https://api.brevo.com/v3/smtp/email");
    private Duration requestTimeout = DEFAULT_REQUEST_TIMEOUT;

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = normalize(apiKey);
    }

    public String getSenderEmail() {
        return senderEmail;
    }

    public void setSenderEmail(String senderEmail) {
        this.senderEmail = normalize(senderEmail);
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = normalize(senderName);
    }

    public String getTestRecipient() {
        return testRecipient;
    }

    public void setTestRecipient(String testRecipient) {
        this.testRecipient = normalize(testRecipient);
    }

    public URI getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(URI endpoint) {
        this.endpoint = endpoint == null
                ? URI.create("https://api.brevo.com/v3/smtp/email")
                : endpoint;
    }

    public Duration getRequestTimeout() {
        return requestTimeout;
    }

    public void setRequestTimeout(Duration requestTimeout) {
        this.requestTimeout = requestTimeout == null
                ? DEFAULT_REQUEST_TIMEOUT
                : requestTimeout;
    }

    public Duration effectiveRequestTimeout() {
        if (requestTimeout.isZero() || requestTimeout.isNegative()) {
            return DEFAULT_REQUEST_TIMEOUT;
        }

        return requestTimeout;
    }

    public List<String> missingEnvironmentVariables() {
        List<String> missing = new ArrayList<>();

        addIfBlank(missing, "BREVO_API_KEY", apiKey);
        addIfBlank(missing, "BREVO_SENDER_EMAIL", senderEmail);
        addIfBlank(missing, "BREVO_SENDER_NAME", senderName);
        addIfBlank(missing, "BREVO_TEST_RECIPIENT", testRecipient);

        return List.copyOf(missing);
    }

    private static void addIfBlank(
            List<String> missing,
            String environmentVariable,
            String value
    ) {
        if (value.isBlank()) {
            missing.add(environmentVariable);
        }
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
