package com.ebooking.modules.inventory;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryQueryService {

    private final ShowSeatRepository showSeatRepository;
    private final Clock clock;

    @Autowired
    public InventoryQueryService(ShowSeatRepository showSeatRepository) {
        this(showSeatRepository, Clock.systemUTC());
    }

    InventoryQueryService(ShowSeatRepository showSeatRepository, Clock clock) {
        this.showSeatRepository = showSeatRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<ShowSeatView> findSeatMap(UUID showId) {
        Instant now = clock.instant();
        return showSeatRepository.findSeatMapByShowId(showId).stream()
                .map(showSeat -> new ShowSeatView(
                        showSeat.getSeat().getId(),
                        showSeat.getSeat().getSectionName(),
                        showSeat.getSeat().getRowName(),
                        showSeat.getSeat().getSeatNumber(),
                        resolvedStatus(showSeat, now)))
                .toList();
    }

    private ShowSeatStatus resolvedStatus(ShowSeat showSeat, Instant now) {
        return showSeat.isHeldByExpiredHold(now) ? ShowSeatStatus.AVAILABLE : showSeat.getStatus();
    }

    public record ShowSeatView(
            UUID seatId,
            String section,
            String row,
            int number,
            ShowSeatStatus status) {
    }
}
