package com.ebooking.config;

import java.util.UUID;

import com.ebooking.shared.web.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    public UUID requireUserId() {
        Authentication authentication = currentAuthentication();
        Object principal = authentication.getPrincipal();
        if (principal instanceof UUID userId) {
            return userId;
        }
        if (principal instanceof String value) {
            try {
                return UUID.fromString(value);
            } catch (IllegalArgumentException ignored) {
                // Fall through to the same safe unauthorized response.
            }
        }
        throw new UnauthorizedException("Authenticated user identity is invalid.");
    }

    private Authentication currentAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Authentication is required.");
        }
        return authentication;
    }
}
