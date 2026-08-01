package com.churchone.backend.service;

import java.util.Map;

public interface BrevoGateway {

    BrevoEmailResult send(Map<String, Object> payload);
}
