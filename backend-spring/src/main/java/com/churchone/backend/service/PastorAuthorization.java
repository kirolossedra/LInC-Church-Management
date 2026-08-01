package com.churchone.backend.service;

public record PastorAuthorization(
        boolean authorized,
        String role
) {
}
