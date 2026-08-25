package com.ebooking.modules.catalog;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VenueSeatRepository extends JpaRepository<VenueSeat, UUID> {

    List<VenueSeat> findByVenueIdOrderBySectionNameAscRowNameAscSeatNumberAsc(UUID venueId);
}

