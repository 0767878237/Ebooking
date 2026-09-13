package com.ebooking.api;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.ebooking.config.CurrentUserService;
import com.ebooking.config.JwtService;
import com.ebooking.modules.identity.UserAccount;
import com.ebooking.modules.identity.UserAccountRepository;
import com.ebooking.modules.identity.UserRole;
import com.ebooking.shared.web.ConflictException;
import com.ebooking.shared.web.UnauthorizedException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/identity")
public class IdentityController {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CurrentUserService currentUserService;

    public IdentityController(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            CurrentUserService currentUserService) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.currentUserService = currentUserService;
    }

    /*
     * This endpoint is intentionally limited to local demo accounts. It lets
     * the frontend resolve UUIDs from an existing database volume safely.
     */
    @GetMapping("/demo-users")
    public List<DemoUserResponse> demoUsers() {
        return userAccountRepository.findAll().stream()
                .filter(user -> user.getEmail().endsWith("@ebooking.local") && user.getRole() != UserRole.ORGANIZER)
                .map(user -> new DemoUserResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getDisplayName(),
                        user.getRole().name()))
                .toList();
    }

    @PostMapping("/demo-token/{userId}")
    public IdentityResponse demoToken(@PathVariable UUID userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Demo user not found."));
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
        return IdentityResponse.from(user, token);
    }

    @GetMapping("/me")
    public IdentityResponse me() {
        UUID userId = currentUserService.requireUserId();
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found."));
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
        return IdentityResponse.from(user, token);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public IdentityResponse register(@Valid @RequestBody RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userAccountRepository.findByEmail(email).isPresent()) {
            throw new ConflictException("Email is already registered.");
        }

        UserAccount user = userAccountRepository.save(new UserAccount(
                UUID.randomUUID(),
                email,
                request.displayName().trim(),
                UserRole.USER,
                passwordEncoder.encode(request.password())));
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
        return IdentityResponse.from(user, token);
    }

    @PostMapping("/login")
    public IdentityResponse login(@Valid @RequestBody LoginRequest request) {
        String email = normalizeEmail(request.email());
        UserAccount user = userAccountRepository.findByEmail(email).orElse(null);
        if (user == null
                || user.getDeletedAt() != null
                || user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials.");
        }
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
        return IdentityResponse.from(user, token);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public record DemoUserResponse(UUID id, String email, String displayName, String role) {
    }

    public record RegisterRequest(
            @Email @NotBlank @Size(max = 255) String email,
            @NotBlank @Size(min = 2, max = 120) String displayName,
            @NotBlank @Size(min = 8, max = 72) String password) {
    }

    public record LoginRequest(
            @Email @NotBlank @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 72) String password) {
    }

    public record IdentityResponse(
            UUID id,
            String email,
            String displayName,
            String role,
            String token) {
        static IdentityResponse from(UserAccount user, String token) {
            return new IdentityResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getDisplayName(),
                    user.getRole().name(),
                    token);
        }
    }
}
