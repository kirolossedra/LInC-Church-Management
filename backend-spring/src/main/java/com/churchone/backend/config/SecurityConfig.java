package com.churchone.backend.config;

import com.churchone.backend.security.ApiSecurityResponseWriter;
import com.churchone.backend.security.FirebaseBearerAuthenticationFilter;
import com.churchone.backend.security.FirebaseSessionAuthenticator;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.time.Clock;

@Configuration(proxyBeanMethods = false)
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            FirebaseSessionAuthenticator sessionAuthenticator,
            ObjectMapper objectMapper,
            Clock clock
    ) throws Exception {
        ApiSecurityResponseWriter responseWriter = new ApiSecurityResponseWriter(
                objectMapper,
                clock
        );

        FirebaseBearerAuthenticationFilter firebaseFilter =
                new FirebaseBearerAuthenticationFilter(
                        sessionAuthenticator,
                        responseWriter
                );

        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(
                        SessionCreationPolicy.STATELESS
                ))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, error) ->
                                responseWriter.write(
                                        response,
                                        HttpServletResponse.SC_UNAUTHORIZED,
                                        "AUTHENTICATION_REQUIRED",
                                        "A valid Firebase Bearer token is required."
                                )
                        )
                        .accessDeniedHandler((request, response, error) ->
                                responseWriter.write(
                                        response,
                                        HttpStatus.FORBIDDEN.value(),
                                        "PASTOR_ACCESS_REQUIRED",
                                        "This Firebase account is not authorized as a Pastor."
                                )
                        )
                )
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/",
                                "/health",
                                "/actuator/health",
                                "/actuator/info"
                        ).permitAll()
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/v1/email/test"
                        ).permitAll()
                        .requestMatchers("/api/v1/auth/session").authenticated()
                        .requestMatchers("/api/v1/auth/pastor-access").hasRole("PASTOR")
                        .requestMatchers("/api/**").denyAll()
                        .anyRequest().permitAll()
                )
                .addFilterBefore(
                        firebaseFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}
