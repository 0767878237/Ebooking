package com.ebooking.modules.catalog;

import java.util.UUID;

import com.ebooking.shared.domain.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "venue_seats")
public class VenueSeat extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id")
    private Venue venue;

    private String sectionName;
    private String rowName;
    private int seatNumber;

    protected VenueSeat() {
    }

    public VenueSeat(UUID id, Venue venue, String sectionName, String rowName, int seatNumber) {
        super(id);
        this.venue = venue;
        this.sectionName = sectionName;
        this.rowName = rowName;
        this.seatNumber = seatNumber;
    }

    public Venue getVenue() {
        return venue;
    }

    public String getSectionName() {
        return sectionName;
    }

    public String getRowName() {
        return rowName;
    }

    public int getSeatNumber() {
        return seatNumber;
    }
}

