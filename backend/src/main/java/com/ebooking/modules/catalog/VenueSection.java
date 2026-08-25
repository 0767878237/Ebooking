package com.ebooking.modules.catalog;

import java.util.UUID;

import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "venue_sections")
public class VenueSection extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id")
    private Venue venue;

    private String name;

    protected VenueSection() {
    }

    public VenueSection(UUID id, Venue venue, String name) {
        super(id);
        this.venue = venue;
        this.name = name;
    }

    public String getName() {
        return name;
    }
}

