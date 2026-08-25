package com.ebooking.modules.event;

import java.time.Instant;
import java.util.UUID;

import com.ebooking.modules.catalog.Venue;
import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "shows")
public class Show extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id")
    private Venue venue;

    private Instant startsAt;
    private Instant endsAt;

    protected Show() {
    }

    public Show(UUID id, Event event, Venue venue, Instant startsAt, Instant endsAt) {
        super(id);
        this.event = event;
        this.venue = venue;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }

    public Event getEvent() {
        return event;
    }

    public Venue getVenue() {
        return venue;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }
}

