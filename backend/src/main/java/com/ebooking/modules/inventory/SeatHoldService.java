package com.ebooking.modules.inventory;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;

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
                SeatHold originalHold = existingHold.get();
                if (originalHold.getUser() == null || userId == null
                        || !userId.equals(originalHold.getUser().getId())) {
                    throw new ConflictException("Idempotency key belongs to another user.");
                }
                List<ShowSeat> existingSeats = showSeatRepository.lockByHoldId(originalHold.getId());
                if (existingSeats.isEmpty() || !showId.equals(existingSeats.get(0).getShow().getId())) {
                    throw new ConflictException("Idempotency key was already used for another hold.");
                }
                Set<UUID> existingSeatIds = existingSeats.stream()
                        .map(showSeat -> showSeat.getSeat().getId())
                        .collect(java.util.stream.Collectors.toSet());
                if (!existingSeatIds.equals(requestedSeats)) {
                    throw new ConflictException("Idempotency key was reused with different seats.");
                }
                existingSeats.forEach(showSeat -> showSeat.releaseIfExpired(now));
                if (originalHold.getStatus() != SeatHoldStatus.ACTIVE
                        || originalHold.isExpiredAt(now)) {
                    throw new ConflictException("The original seat hold has expired.");
                }
                return toResult(originalHold, showId, existingSeats);
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

        releaseExpiredSelectedHolds(showSeats, now);

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
        List<SeatHold> candidates;
        do {
            candidates = seatHoldRepository.findByStatusAndExpiresAtLessThanEqual(
                    SeatHoldStatus.ACTIVE, now, PageRequest.of(0, 500)).getContent();
            for (SeatHold hold : candidates) {
                List<ShowSeat> showSeats = showSeatRepository.lockByHoldId(hold.getId());
                if (releaseExpiredHold(hold, showSeats, now)) {
                    released++;
                }
            }
            seatHoldRepository.flush();
        } while (candidates.size() == 500);
        return released;
    }

    private boolean releaseExpiredHold(SeatHold hold, List<ShowSeat> showSeats, Instant now) {
        if (!hold.isExpiredAt(now)) {
            return false;
        }
        hold.expire();
        showSeats.forEach(ShowSeat::releaseToAvailable);
        return true;
    }

    private void releaseExpiredSelectedHolds(List<ShowSeat> selectedSeats, Instant now) {
        selectedSeats.stream()
                .filter(showSeat -> showSeat.isHeldByExpiredHold(now))
                .map(ShowSeat::getHold)
                .distinct()
                .forEach(expiredHold -> releaseExpiredHold(
                        expiredHold, showSeatRepository.lockByHoldId(expiredHold.getId()), now));
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
        String normalized = value.trim();
        if (normalized.length() > 100) {
            throw new IllegalArgumentException("Idempotency-Key must be at most 100 characters.");
        }
        return normalized;
    }

    private String seatLabel(com.ebooking.modules.catalog.VenueSeat seat) {
        return seat.getSectionName() + "-" + seat.getRowName() + seat.getSeatNumber();
    }

    public record SeatHoldResult(UUID holdId, UUID showId, Instant expiresAt, List<SeatHoldSeat> seats) {
    }

    public record SeatHoldSeat(UUID seatId, String label) {
    }
}
