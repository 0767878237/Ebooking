package com.ebooking.modules.inventory;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.ebooking.modules.event.ShowRepository;
import com.ebooking.modules.identity.UserAccount;
import com.ebooking.modules.identity.UserAccountRepository;
import com.ebooking.shared.web.ConflictException;
import com.ebooking.shared.web.NotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SeatHoldService {

    private static final Duration HOLD_DURATION = Duration.ofMinutes(5);

    private final ShowRepository showRepository;
    private final ShowSeatRepository showSeatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final UserAccountRepository userAccountRepository;
    private final Clock clock;

    @Autowired
    public SeatHoldService(
            ShowRepository showRepository,
            ShowSeatRepository showSeatRepository,
            SeatHoldRepository seatHoldRepository,
            UserAccountRepository userAccountRepository) {
        this(showRepository, showSeatRepository, seatHoldRepository, userAccountRepository, Clock.systemUTC());
    }

    SeatHoldService(
            ShowRepository showRepository,
            ShowSeatRepository showSeatRepository,
            SeatHoldRepository seatHoldRepository,
            UserAccountRepository userAccountRepository,
            Clock clock) {
        this.showRepository = showRepository;
        this.showSeatRepository = showSeatRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.userAccountRepository = userAccountRepository;
        this.clock = clock;
    }

    @Transactional
    public SeatHoldResult createHold(UUID showId, UUID userId, List<UUID> requestedSeatIds) {
        Set<UUID> requestedSeats = Set.copyOf(requestedSeatIds);
        if (requestedSeats.size() != requestedSeatIds.size()) {
            throw new IllegalArgumentException("Seat list must not contain duplicates.");
        }

        showRepository.findById(showId)
                .orElseThrow(() -> new NotFoundException("Show was not found."));

        UserAccount user = userId == null
                ? null
                : userAccountRepository.findById(userId)
                        .orElseThrow(() -> new NotFoundException("User was not found."));

        List<ShowSeat> showSeats = showSeatRepository.lockByShowIdAndSeatIds(showId, requestedSeats);
        if (showSeats.size() != requestedSeats.size()) {
            throw new NotFoundException("One or more seats do not belong to this show.");
        }

        Instant now = clock.instant();
        showSeats.forEach(showSeat -> showSeat.releaseIfExpired(now));

        List<String> unavailableSeats = showSeats.stream()
                .filter(showSeat -> !showSeat.isAvailable())
                .map(showSeat -> seatLabel(showSeat.getSeat()))
                .sorted()
                .toList();
        if (!unavailableSeats.isEmpty()) {
            throw new ConflictException("Seats are no longer available: " + String.join(", ", unavailableSeats));
        }

        Instant expiresAt = now.plus(HOLD_DURATION);
        SeatHold hold = seatHoldRepository.save(new SeatHold(UUID.randomUUID(), user, expiresAt));
        showSeats.forEach(showSeat -> showSeat.hold(hold));

        List<SeatHoldSeat> seats = showSeats.stream()
                .map(showSeat -> new SeatHoldSeat(
                        showSeat.getSeat().getId(),
                        seatLabel(showSeat.getSeat())))
                .sorted(Comparator.comparing(SeatHoldSeat::label))
                .toList();

        return new SeatHoldResult(hold.getId(), showId, expiresAt, seats);
    }

    private String seatLabel(com.ebooking.modules.catalog.VenueSeat seat) {
        return seat.getSectionName() + "-" + seat.getRowName() + seat.getSeatNumber();
    }

    public record SeatHoldResult(UUID holdId, UUID showId, Instant expiresAt, List<SeatHoldSeat> seats) {
    }

    public record SeatHoldSeat(UUID seatId, String label) {
    }
}
