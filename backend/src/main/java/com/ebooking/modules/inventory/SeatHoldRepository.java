package com.ebooking.modules.inventory;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatHoldRepository extends JpaRepository<SeatHold, UUID> {
}

