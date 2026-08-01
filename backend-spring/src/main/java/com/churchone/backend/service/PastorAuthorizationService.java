package com.churchone.backend.service;

import com.churchone.backend.repository.PastorRoleRepository;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class PastorAuthorizationService {

    private static final String PASTOR_ROLE = "pastor";

    private final PastorRoleRepository pastorRoleRepository;

    public PastorAuthorizationService(PastorRoleRepository pastorRoleRepository) {
        this.pastorRoleRepository = pastorRoleRepository;
    }

    public PastorAuthorization authorize(String email) {
        String normalizedEmail = normalizeEmail(email);

        if (normalizedEmail.isBlank()) {
            return new PastorAuthorization(false, null);
        }

        String storedRole = pastorRoleRepository.findRoleByEmail(normalizedEmail);
        boolean isPastor = PASTOR_ROLE.equals(storedRole);

        return new PastorAuthorization(
                isPastor,
                isPastor ? PASTOR_ROLE : null
        );
    }

    static String normalizeEmail(String email) {
        return email == null
                ? ""
                : email.trim().toLowerCase(Locale.ROOT);
    }
}
