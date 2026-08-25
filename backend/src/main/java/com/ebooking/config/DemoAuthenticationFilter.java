package com.ebooking.config;

import java.io.IOException;
import java.util.UUID;

import com.ebooking.modules.identity.UserAccount;
import com.ebooking.modules.identity.UserAccountRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class DemoAuthenticationFilter extends OncePerRequestFilter {

    private final UserAccountRepository userAccountRepository;

    public DemoAuthenticationFilter(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String rawUserId = request.getHeader("X-User-Id");
        if (rawUserId != null && !rawUserId.isBlank()) {
            try {
                UUID userId = UUID.fromString(rawUserId.trim());
                userAccountRepository.findById(userId).ifPresent(this::authenticate);
            } catch (IllegalArgumentException ignored) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid X-User-Id header.");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private void authenticate(UserAccount user) {
        var authorities = java.util.List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        var authentication = new UsernamePasswordAuthenticationToken(user.getId(), null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
