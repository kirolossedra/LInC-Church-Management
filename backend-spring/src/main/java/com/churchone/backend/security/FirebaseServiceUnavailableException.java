package com.churchone.backend.security;

public class FirebaseServiceUnavailableException extends RuntimeException {

    public FirebaseServiceUnavailableException(String message) {
        super(message);
    }

    public FirebaseServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
