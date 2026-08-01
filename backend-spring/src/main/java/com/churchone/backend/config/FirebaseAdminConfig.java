package com.churchone.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.FirebaseDatabase;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(FirebaseProperties.class)
public class FirebaseAdminConfig {

    private static final String FIREBASE_APP_NAME = "churchone-spring-backend";

    @Bean(destroyMethod = "delete")
    @ConditionalOnProperty(
            prefix = "app.firebase",
            name = "enabled",
            havingValue = "true"
    )
    FirebaseApp firebaseApp(FirebaseProperties properties) throws IOException {
        properties.validateEnabledConfiguration();

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(loadCredentials(properties))
                .setProjectId(properties.getProjectId())
                .setDatabaseUrl(properties.getDatabaseUrl())
                .build();

        return FirebaseApp.initializeApp(options, FIREBASE_APP_NAME);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.firebase",
            name = "enabled",
            havingValue = "true"
    )
    FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "app.firebase",
            name = "enabled",
            havingValue = "true"
    )
    FirebaseDatabase firebaseDatabase(FirebaseApp firebaseApp) {
        return FirebaseDatabase.getInstance(firebaseApp);
    }

    private GoogleCredentials loadCredentials(FirebaseProperties properties)
            throws IOException {
        if (!properties.getServiceAccountJsonBase64().isBlank()) {
            byte[] decoded;

            try {
                decoded = Base64.getDecoder().decode(
                        properties.getServiceAccountJsonBase64()
                );
            } catch (IllegalArgumentException error) {
                throw new IllegalStateException(
                        "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is not valid Base64.",
                        error
                );
            }

            try (InputStream input = new ByteArrayInputStream(decoded)) {
                return GoogleCredentials.fromStream(input);
            }
        }

        if (!properties.getServiceAccountJson().isBlank()) {
            byte[] json = properties.getServiceAccountJson()
                    .getBytes(StandardCharsets.UTF_8);

            try (InputStream input = new ByteArrayInputStream(json)) {
                return GoogleCredentials.fromStream(input);
            }
        }

        return GoogleCredentials.getApplicationDefault();
    }
}
