package com.churchone.backend.service;

public class BrevoRequestException extends RuntimeException {

    private final Integer providerStatus;

    public BrevoRequestException(String message, Integer providerStatus) {
        super(message);
        this.providerStatus = providerStatus;
    }

    public BrevoRequestException(
            String message,
            Integer providerStatus,
            Throwable cause
    ) {
        super(message, cause);
        this.providerStatus = providerStatus;
    }

    public Integer getProviderStatus() {
        return providerStatus;
    }
}
