package com.churchone.backend.service;

import java.util.List;

public class BrevoConfigurationException extends RuntimeException {

    private final List<String> missingEnvironmentVariables;

    public BrevoConfigurationException(List<String> missingEnvironmentVariables) {
        super("The email service is not configured.");
        this.missingEnvironmentVariables = List.copyOf(missingEnvironmentVariables);
    }

    public List<String> getMissingEnvironmentVariables() {
        return missingEnvironmentVariables;
    }
}
