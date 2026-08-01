package com.churchone.backend.controller;

public class EmailTestValidationException extends RuntimeException {

    public EmailTestValidationException() {
        super("The request body is invalid.");
    }
}
