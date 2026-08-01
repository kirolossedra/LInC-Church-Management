package com.churchone.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.http.HttpClient;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(BrevoProperties.class)
public class BrevoClientConfig {

    @Bean
    HttpClient brevoHttpClient(BrevoProperties properties) {
        return HttpClient.newBuilder()
                .connectTimeout(properties.effectiveRequestTimeout())
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }
}
