package com.churchone.backend.repository;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FirebasePastorRoleRepositoryTest {

    @Test
    void convertsEmailToTheExistingRealtimeDatabaseKeyFormat() {
        assertThat(
                FirebasePastorRoleRepository.toFirebaseEmailKey(
                        "pastor.name@example.com"
                )
        ).isEqualTo("pastor,name@example,com");
    }
}
