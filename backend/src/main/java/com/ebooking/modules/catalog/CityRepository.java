package com.ebooking.modules.catalog;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRepository extends JpaRepository<City, UUID> {

    Optional<City> findByNameIgnoreCase(String name);

    Page<City> findByDeletedAtIsNull(Pageable pageable);
}
