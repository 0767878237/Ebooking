package com.ebooking.modules.catalog;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRepository extends JpaRepository<City, UUID> {
}

