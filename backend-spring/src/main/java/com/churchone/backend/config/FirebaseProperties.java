package com.churchone.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.firebase")
public class FirebaseProperties {

    private boolean enabled;
    private String projectId = "";
    private String databaseUrl = "";
    private String serviceAccountJsonBase64 = "";
    private String serviceAccountJson = "";
    private boolean checkRevokedTokens;
    private Duration roleLookupTimeout = Duration.ofSeconds(5);

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = normalize(projectId);
    }

    public String getDatabaseUrl() {
        return databaseUrl;
    }

    public void setDatabaseUrl(String databaseUrl) {
        this.databaseUrl = normalize(databaseUrl);
    }

    public String getServiceAccountJsonBase64() {
        return serviceAccountJsonBase64;
    }

    public void setServiceAccountJsonBase64(String serviceAccountJsonBase64) {
        this.serviceAccountJsonBase64 = normalize(serviceAccountJsonBase64);
    }

    public String getServiceAccountJson() {
        return serviceAccountJson;
    }

    public void setServiceAccountJson(String serviceAccountJson) {
        this.serviceAccountJson = serviceAccountJson == null ? "" : serviceAccountJson.trim();
    }

    public boolean isCheckRevokedTokens() {
        return checkRevokedTokens;
    }

    public void setCheckRevokedTokens(boolean checkRevokedTokens) {
        this.checkRevokedTokens = checkRevokedTokens;
    }

    public Duration getRoleLookupTimeout() {
        return roleLookupTimeout;
    }

    public void setRoleLookupTimeout(Duration roleLookupTimeout) {
        this.roleLookupTimeout = roleLookupTimeout == null
                ? Duration.ofSeconds(5)
                : roleLookupTimeout;
    }

    public void validateEnabledConfiguration() {
        if (!enabled) {
            return;
        }

        if (projectId.isBlank()) {
            throw new IllegalStateException(
                    "FIREBASE_PROJECT_ID is required when FIREBASE_ENABLED=true."
            );
        }

        if (databaseUrl.isBlank()) {
            throw new IllegalStateException(
                    "FIREBASE_DATABASE_URL is required when FIREBASE_ENABLED=true."
            );
        }

        if (roleLookupTimeout.isZero() || roleLookupTimeout.isNegative()) {
            throw new IllegalStateException(
                    "FIREBASE_ROLE_LOOKUP_TIMEOUT must be greater than zero."
            );
        }
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
