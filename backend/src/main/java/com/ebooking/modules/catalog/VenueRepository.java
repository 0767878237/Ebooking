package com.ebooking.modules.catalog;

import java.util.UUID;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VenueRepository extends JpaRepository<Venue, UUID> {

    @EntityGraph(attributePaths = "city")
    List<Venue> findByCityIdOrderByNameAsc(UUID cityId);
}
