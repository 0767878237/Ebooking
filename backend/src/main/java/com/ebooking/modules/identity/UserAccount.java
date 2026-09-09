package com.ebooking.modules.identity;

import java.util.UUID;

import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class UserAccount extends BaseEntity {

    private String email;
    private String displayName;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

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

    public UserAccount(UUID id, String email, String displayName, UserRole role, String passwordHash) {
        this(id, email, displayName, role);
        this.passwordHash = passwordHash;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public UserRole getRole() {
        return role;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
