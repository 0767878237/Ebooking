package com.ebooking.modules.event;

import java.util.UUID;

import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "genres")
public class Genre extends BaseEntity {

    private String name;
    private String slug;

    protected Genre() {
    }

    public Genre(UUID id, String name, String slug) {
        super(id);
        this.name = name;
        this.slug = slug;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }
}

