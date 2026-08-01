package com.churchone.backend.service;

import com.churchone.backend.config.BrevoProperties;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BrevoEmailService {

    private static final String TEST_RECIPIENT_NAME = "LinC Backend Test";
    private static final String TEST_SUBJECT = "LinC Spring backend test";
    private static final String TEST_HTML_CONTENT = """
            <html>
              <body>
                <h1>LinC backend test succeeded</h1>
                <p>
                  This email request passed through the Spring Boot backend.
                </p>
              </body>
            </html>
            """;

    private final BrevoProperties properties;
    private final BrevoGateway gateway;

    public BrevoEmailService(
            BrevoProperties properties,
            BrevoGateway gateway
    ) {
        this.properties = properties;
        this.gateway = gateway;
    }

    public BrevoEmailResult sendTestEmail(boolean sandbox) {
        List<String> missing = properties.missingEnvironmentVariables();

        if (!missing.isEmpty()) {
            throw new BrevoConfigurationException(missing);
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sender", Map.of(
                "name", properties.getSenderName(),
                "email", properties.getSenderEmail()
        ));
        payload.put("to", List.of(Map.of(
                "email", properties.getTestRecipient(),
                "name", TEST_RECIPIENT_NAME
        )));
        payload.put("subject", TEST_SUBJECT);
        payload.put("htmlContent", TEST_HTML_CONTENT);

        if (sandbox) {
            payload.put("headers", Map.of("X-Sib-Sandbox", "drop"));
        }

        return gateway.send(payload);
    }
}
