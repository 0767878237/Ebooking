package com.ebooking.modules.catalog;

import java.util.UUID;

import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "cities")
public class City extends BaseEntity {

    private String name;

    protected City() {
    }

    public City(UUID id, String name) {
        super(id);
        this.name = name;
    }

    public String getName() {
        return name;
    }
}

