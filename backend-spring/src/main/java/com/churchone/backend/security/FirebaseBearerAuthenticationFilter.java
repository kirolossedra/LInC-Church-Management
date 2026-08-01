package com.churchone.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class FirebaseBearerAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final FirebaseSessionAuthenticator sessionAuthenticator;
    private final ApiSecurityResponseWriter responseWriter;

    public FirebaseBearerAuthenticationFilter(
            FirebaseSessionAuthenticator sessionAuthenticator,
            ApiSecurityResponseWriter responseWriter
    ) {
        this.sessionAuthenticator = sessionAuthenticator;
        this.responseWriter = responseWriter;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!authorizationHeader.regionMatches(
                true,
                0,
                BEARER_PREFIX,
                0,
                BEARER_PREFIX.length()
        )) {
            responseWriter.write(
                    response,
                    HttpStatus.UNAUTHORIZED.value(),
                    "INVALID_AUTHORIZATION_HEADER",
                    "Use the Authorization header with a Firebase Bearer token."
            );
            return;
        }

        String idToken = authorizationHeader.substring(BEARER_PREFIX.length()).trim();

        if (idToken.isBlank()) {
            responseWriter.write(
                    response,
                    HttpStatus.UNAUTHORIZED.value(),
                    "MISSING_FIREBASE_TOKEN",
                    "The Firebase Bearer token is missing."
            );
            return;
        }

        try {
            AuthenticatedFirebaseUser principal = sessionAuthenticator.authenticate(idToken);
            List<SimpleGrantedAuthority> authorities = new ArrayList<>();
            authorities.add(new SimpleGrantedAuthority("ROLE_FIREBASE_USER"));

            if (principal.pastor()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_PASTOR"));
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            principal,
                            null,
                            authorities
                    );

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            filterChain.doFilter(request, response);
        } catch (InvalidFirebaseTokenException error) {
            SecurityContextHolder.clearContext();
            responseWriter.write(
                    response,
                    HttpStatus.UNAUTHORIZED.value(),
                    "INVALID_FIREBASE_TOKEN",
                    error.getMessage()
            );
        } catch (FirebaseServiceUnavailableException error) {
            SecurityContextHolder.clearContext();
            responseWriter.write(
                    response,
                    HttpStatus.SERVICE_UNAVAILABLE.value(),
                    "FIREBASE_SERVICE_UNAVAILABLE",
                    error.getMessage()
            );
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        return path.equals("/")
                || path.equals("/health")
                || path.equals("/error")
                || path.startsWith("/actuator/");
    }
}
