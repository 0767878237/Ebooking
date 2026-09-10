package com.ebooking.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.ebooking.modules.identity.UserRole;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String HEADER_JSON = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private static final String ENCODED_HEADER = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(HEADER_JSON.getBytes(StandardCharsets.UTF_8));

    private final byte[] secretKeyBytes;
    private final long expirationSeconds;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public JwtService(
            @Value("${ebooking.security.jwt-secret:local-development-jwt-secret-key-must-be-at-least-256-bits-long!!}") String secretKey,
            @Value("${ebooking.security.jwt-expiration-seconds:86400}") long expirationSeconds,
            ObjectMapper objectMapper) {
        this(secretKey, expirationSeconds, objectMapper, Clock.systemUTC());
    }

    JwtService(
            String secretKey,
            long expirationSeconds,
            ObjectMapper objectMapper,
            Clock clock) {
        this.secretKeyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        this.expirationSeconds = expirationSeconds;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public String generateToken(UUID userId, String email, String displayName, UserRole role) {
        Instant now = clock.instant();
        Instant expiresAt = now.plusSeconds(expirationSeconds);

        Map<String, Object> payload = Map.of(
                "sub", userId.toString(),
                "email", email,
                "name", displayName != null ? displayName : "",
                "role", role.name(),
                "iat", now.getEpochSecond(),
                "exp", expiresAt.getEpochSecond());

        try {
            String payloadJson = objectMapper.writeValueAsString(payload);
            String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
            String dataToSign = ENCODED_HEADER + "." + encodedPayload;
            String signature = sign(dataToSign);
            return dataToSign + "." + signature;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate JWT token", e);
        }
    }

    public Optional<JwtClaims> validateAndExtract(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }

        String[] parts = token.trim().split("\\.");
        if (parts.length != 3) {
            return Optional.empty();
        }

        String encodedHeader = parts[0];
        String encodedPayload = parts[1];
        String signature = parts[2];

        String expectedSignature = sign(encodedHeader + "." + encodedPayload);
        if (!MessageDigest.isEqual(
                signature.getBytes(StandardCharsets.UTF_8),
                expectedSignature.getBytes(StandardCharsets.UTF_8))) {
            log.debug("JWT signature mismatch");
            return Optional.empty();
        }

        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(encodedPayload);
            Map<String, Object> claims = objectMapper.readValue(payloadBytes, new TypeReference<>() {});

            Number expNumber = (Number) claims.get("exp");
            if (expNumber == null || expNumber.longValue() < clock.instant().getEpochSecond()) {
                log.debug("JWT token is expired");
                return Optional.empty();
            }

            String sub = (String) claims.get("sub");
            String email = (String) claims.get("email");
            String name = (String) claims.get("name");
            String roleStr = (String) claims.get("role");

            if (sub == null || email == null || roleStr == null) {
                return Optional.empty();
            }

            UUID userId = UUID.fromString(sub);
            UserRole role = UserRole.valueOf(roleStr);
            return Optional.of(new JwtClaims(userId, email, name, role));
        } catch (Exception e) {
            log.debug("Failed to parse JWT payload: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secretKeyBytes, HMAC_ALGORITHM));
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute HMAC signature", e);
        }
    }

    public record JwtClaims(UUID userId, String email, String displayName, UserRole role) {
    }
}