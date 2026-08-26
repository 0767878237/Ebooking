package com.ebooking.modules.catalog;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VenueRepository extends JpaRepository<Venue, UUID> {

    @EntityGraph(attributePaths = "city")
    List<Venue> findByCityIdAndDeletedAtIsNullOrderByNameAsc(UUID cityId);

    @EntityGraph(attributePaths = "city")
    Page<Venue> findByDeletedAtIsNull(Pageable pageable);

    @EntityGraph(attributePaths = "city")
    Page<Venue> findByCityIdAndDeletedAtIsNull(UUID cityId, Pageable pageable);
}
