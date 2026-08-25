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
import org.springframework.scheduling.annotation.Scheduled;
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
        return createHold(showId, userId, requestedSeatIds, null);
    }

    @Transactional
    public SeatHoldResult createHold(
            UUID showId,
            UUID userId,
            List<UUID> requestedSeatIds,
            String idempotencyKey) {
        Set<UUID> requestedSeats = Set.copyOf(requestedSeatIds);
        if (requestedSeats.size() != requestedSeatIds.size()) {
            throw new IllegalArgumentException("Seat list must not contain duplicates.");
        }

        Instant now = clock.instant();
        String normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);
        if (normalizedIdempotencyKey != null) {
            var existingHold = seatHoldRepository.findByIdempotencyKey(normalizedIdempotencyKey);
            if (existingHold.isPresent()) {
                List<ShowSeat> existingSeats = showSeatRepository.lockByHoldId(existingHold.get().getId());
                if (existingSeats.isEmpty() || !showId.equals(existingSeats.get(0).getShow().getId())) {
                    throw new ConflictException("Idempotency key was already used for another hold.");
                }
                existingSeats.forEach(showSeat -> showSeat.releaseIfExpired(now));
                if (existingHold.get().isExpiredAt(now)) {
                    throw new ConflictException("The original seat hold has expired.");
                }
                return toResult(existingHold.get(), showId, existingSeats);
            }
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
        SeatHold hold = seatHoldRepository.save(new SeatHold(
                UUID.randomUUID(), user, expiresAt, normalizedIdempotencyKey));
        showSeats.forEach(showSeat -> showSeat.hold(hold));

        return toResult(hold, showId, showSeats);
    }

    @Scheduled(fixedDelayString = "30000")
    @Transactional
    public int releaseExpiredHolds() {
        Instant now = clock.instant();
        int released = 0;
        for (SeatHold hold : seatHoldRepository.findByStatusAndExpiresAtLessThanEqual(
                SeatHoldStatus.ACTIVE, now)) {
            List<ShowSeat> showSeats = showSeatRepository.lockByHoldId(hold.getId());
            showSeats.forEach(showSeat -> showSeat.releaseIfExpired(now));
            if (hold.getStatus() == SeatHoldStatus.EXPIRED) {
                released++;
            }
        }
        return released;
    }

    private SeatHoldResult toResult(SeatHold hold, UUID showId, List<ShowSeat> showSeats) {
        List<SeatHoldSeat> seats = showSeats.stream()
                .map(showSeat -> new SeatHoldSeat(
                        showSeat.getSeat().getId(),
                        seatLabel(showSeat.getSeat())))
                .sorted(Comparator.comparing(SeatHoldSeat::label))
                .toList();

        return new SeatHoldResult(hold.getId(), showId, hold.getExpiresAt(), seats);
    }

    private static String normalizeIdempotencyKey(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String seatLabel(com.ebooking.modules.catalog.VenueSeat seat) {
        return seat.getSectionName() + "-" + seat.getRowName() + seat.getSeatNumber();
    }

    public record SeatHoldResult(UUID holdId, UUID showId, Instant expiresAt, List<SeatHoldSeat> seats) {
    }

    public record SeatHoldSeat(UUID seatId, String label) {
    }
}
