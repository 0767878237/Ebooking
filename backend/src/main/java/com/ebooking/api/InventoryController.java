package com.ebooking.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.ebooking.config.CurrentUserService;
import com.ebooking.modules.inventory.InventoryQueryService;
import com.ebooking.modules.inventory.SeatHoldService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shows/{showId}")
public class InventoryController {

    private final InventoryQueryService inventoryQueryService;
    private final SeatHoldService seatHoldService;
    private final CurrentUserService currentUserService;

    public InventoryController(
            InventoryQueryService inventoryQueryService,
            SeatHoldService seatHoldService,
            CurrentUserService currentUserService) {
        this.inventoryQueryService = inventoryQueryService;
        this.seatHoldService = seatHoldService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/seats")
    public List<InventoryQueryService.ShowSeatView> findSeatMap(@PathVariable UUID showId) {
        return inventoryQueryService.findSeatMap(showId);
    }

    @PostMapping("/holds")
    @ResponseStatus(HttpStatus.CREATED)
    public SeatHoldResponse createHold(
            @PathVariable UUID showId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateSeatHoldRequest request) {
        SeatHoldService.SeatHoldResult hold = seatHoldService.createHold(
                showId, currentUserService.requireUserId(), request.seatIds(), idempotencyKey);
        return new SeatHoldResponse(hold.holdId(), hold.showId(), hold.expiresAt(), hold.seats());
    }

    public record CreateSeatHoldRequest(
            @NotEmpty @Size(max = 10) List<@jakarta.validation.constraints.NotNull UUID> seatIds) {
    }

    public record SeatHoldResponse(
            UUID holdId,
            UUID showId,
            Instant expiresAt,
            List<SeatHoldService.SeatHoldSeat> seats) {
    }
}
