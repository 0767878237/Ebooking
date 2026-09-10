package com.ebooking.config;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

import com.ebooking.modules.identity.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private final String secret = "a-very-secret-test-key-with-at-least-256-bits-length-12345678";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Instant fixedTime = Instant.parse("2026-09-09T12:00:00Z");

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(fixedTime, ZoneId.of("UTC"));
        jwtService = new JwtService(secret, 3600, objectMapper, clock);
    }

    @Test
    void generatesAndValidatesTokenSuccessfully() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "test@ebooking.local", "Test User", UserRole.USER);

        assertNotNull(token);
        assertTrue(token.contains("."));

        var claimsOpt = jwtService.validateAndExtract(token);
        assertTrue(claimsOpt.isPresent());

        var claims = claimsOpt.get();
        assertEquals(userId, claims.userId());
        assertEquals("test@ebooking.local", claims.email());
        assertEquals("Test User", claims.displayName());
        assertEquals(UserRole.USER, claims.role());
    }

    @Test
    void rejectsTamperedToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "test@ebooking.local", "Test User", UserRole.USER);
        String[] parts = token.split("\\.");
        String tampered = parts[0] + "." + parts[1] + "tampered." + parts[2];

        var claimsOpt = jwtService.validateAndExtract(tampered);
        assertTrue(claimsOpt.isEmpty());
    }

    @Test
    void rejectsExpiredToken() {
        Clock expiredClock = Clock.fixed(fixedTime.plusSeconds(4000), ZoneId.of("UTC"));
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "test@ebooking.local", "Test User", UserRole.USER);

        JwtService verifier = new JwtService(secret, 3600, objectMapper, expiredClock);
        var claimsOpt = verifier.validateAndExtract(token);
        assertTrue(claimsOpt.isEmpty());
    }
}
