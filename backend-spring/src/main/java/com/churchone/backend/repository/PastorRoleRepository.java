package com.churchone.backend.repository;

public interface PastorRoleRepository {

    String findRoleByEmail(String normalizedEmail);
}
