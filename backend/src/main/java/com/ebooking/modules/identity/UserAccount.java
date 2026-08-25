package com.ebooking.modules.identity;

import java.util.UUID;

import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserAccount extends BaseEntity {

    private String email;
    private String displayName;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    protected UserAccount() {
    }

    public UserAccount(UUID id, String email, String displayName, UserRole role) {
        super(id);
        this.email = email;
        this.displayName = displayName;
        this.role = role;
    }

    public String getEmail() {
        return email;
    }

    public UserRole getRole() {
        return role;
    }
}

