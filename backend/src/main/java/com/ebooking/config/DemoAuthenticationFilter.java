package com.ebooking.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import com.ebooking.modules.identity.UserAccount;
import com.ebooking.modules.identity.UserAccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class DemoAuthenticationFilter extends OncePerRequestFilter {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public DemoAuthenticationFilter(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String token = authHeader.substring(7).trim();
            var claims = jwtService.validateAndExtract(token);
            if (claims.isEmpty()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired Bearer token.");
                return;
            }
            var jwt = claims.get();
            var authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_" + jwt.role().name()));
            var authentication = new UsernamePasswordAuthenticationToken(jwt.userId(), null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } else {
            String rawUserId = request.getHeader("X-User-Id");
            if (rawUserId != null && !rawUserId.isBlank()) {
                try {
                    UUID userId = UUID.fromString(rawUserId.trim());
                    UserAccount user = userAccountRepository.findById(userId).orElse(null);
                    if (user == null || user.getDeletedAt() != null) {
                        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unknown user.");
                        return;
                    }
                    authenticate(user);
                } catch (IllegalArgumentException ignored) {
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid X-User-Id header.");
                    return;
                }
            } else {
                authenticateBasicIfPresent(request, response);
            }
        }
        filterChain.doFilter(request, response);
    }

    private void authenticateBasicIfPresent(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        String header = request.getHeader("Authorization");
        if (header == null || header.isBlank()) {
            return;
        }
        if (!header.regionMatches(true, 0, "Basic ", 0, 6)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unsupported authorization scheme.");
            return;
        }

        try {
            String decoded = new String(
                    Base64.getDecoder().decode(header.substring(6).trim()),
                    StandardCharsets.UTF_8);
            int separator = decoded.indexOf(':');
            if (separator <= 0) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Basic credentials.");
                return;
            }
            String email = decoded.substring(0, separator).trim().toLowerCase();
            String password = decoded.substring(separator + 1);
            UserAccount user = userAccountRepository.findByEmail(email).orElse(null);
            if (user == null
                    || user.getDeletedAt() != null
                    || user.getPasswordHash() == null
                    || !passwordEncoder.matches(password, user.getPasswordHash())) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid credentials.");
                return;
            }
            authenticate(user);
        } catch (IllegalArgumentException ignored) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Basic credentials.");
        }
    }

    private void authenticate(UserAccount user) {
        var authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        var authentication = new UsernamePasswordAuthenticationToken(user.getId(), null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
