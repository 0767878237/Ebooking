package com.ebooking.api;

import java.util.List;

import com.ebooking.modules.identity.UserAccountRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/identity")
public class IdentityController {

    private final UserAccountRepository userAccountRepository;

    public IdentityController(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    /*
     * This endpoint is intentionally limited to local demo accounts. It lets
     * the frontend resolve UUIDs from an existing database volume safely.
     */
    @GetMapping("/demo-users")
    public List<DemoUserResponse> demoUsers() {
        return userAccountRepository.findAll().stream()
                .filter(user -> user.getEmail().endsWith("@ebooking.local"))
                .map(user -> new DemoUserResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getRole().name()))
                .toList();
    }

    public record DemoUserResponse(java.util.UUID id, String email, String role) {
    }
}
