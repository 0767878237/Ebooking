package com.ebooking.modules.catalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VenueSectionRepository extends JpaRepository<VenueSection, UUID> {
    List<VenueSection> findByVenueId(UUID venueId);
    Optional<VenueSection> findByVenueIdAndName(UUID venueId, String name);
}

