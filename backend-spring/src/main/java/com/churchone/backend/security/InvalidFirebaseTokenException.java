package com.churchone.backend.security;

public class InvalidFirebaseTokenException extends RuntimeException {

    public InvalidFirebaseTokenException(String message, Throwable cause) {
        super(message, cause);
    }

    public InvalidFirebaseTokenException(String message) {
        super(message);
    }
}
