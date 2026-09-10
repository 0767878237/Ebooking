package com.ebooking.modules.booking;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import com.ebooking.modules.identity.UserAccount;
import com.ebooking.modules.inventory.SeatHold;
import com.ebooking.modules.inventory.SeatHoldRepository;
import com.ebooking.modules.inventory.SeatHoldStatus;
import com.ebooking.modules.inventory.ShowSeat;
import com.ebooking.modules.inventory.ShowSeatRepository;
import com.ebooking.modules.payment.Payment;
import com.ebooking.modules.payment.PaymentProvider;
import com.ebooking.modules.payment.PaymentRepository;
import com.ebooking.modules.payment.PaymentStatus;
import com.ebooking.modules.ticket.TicketService;
import com.ebooking.shared.web.ConflictException;
import com.ebooking.shared.web.NotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final ShowSeatRepository showSeatRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentProvider paymentProvider;
    private final TicketService ticketService;
    private final Clock clock;

    @Autowired
    public BookingService(
            BookingRepository bookingRepository,
            BookingSeatRepository bookingSeatRepository,
            SeatHoldRepository seatHoldRepository,
            ShowSeatRepository showSeatRepository,
            PaymentRepository paymentRepository,
            PaymentProvider paymentProvider,
            TicketService ticketService) {
        this(bookingRepository, bookingSeatRepository, seatHoldRepository, showSeatRepository,
                paymentRepository, paymentProvider, ticketService, Clock.systemUTC());
    }

    BookingService(
            BookingRepository bookingRepository,
            BookingSeatRepository bookingSeatRepository,
            SeatHoldRepository seatHoldRepository,
            ShowSeatRepository showSeatRepository,
            PaymentRepository paymentRepository,
            PaymentProvider paymentProvider,
            TicketService ticketService,
            Clock clock) {
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.showSeatRepository = showSeatRepository;
        this.paymentRepository = paymentRepository;
        this.paymentProvider = paymentProvider;
        this.ticketService = ticketService;
        this.clock = clock;
    }

    @Transactional
    public BookingResult createBooking(UUID holdId, UUID userId) {
        SeatHold hold = seatHoldRepository.lockById(holdId)
                .orElseThrow(() -> new NotFoundException("Seat hold was not found."));

        Instant now = clock.instant();
        if (hold.isExpiredAt(now) || hold.getStatus() != SeatHoldStatus.ACTIVE) {
            throw new ConflictException("Seat hold is no longer active.");
        }

        bookingRepository.findByHoldId(holdId).ifPresent(existing -> {
            throw new ConflictException("Booking already exists for this hold.");
        });

        List<ShowSeat> showSeats = showSeatRepository.lockByHoldId(holdId);
        if (showSeats.isEmpty()) {
            throw new ConflictException("Seat hold does not map to any show seats.");
        }

        showSeats.forEach(showSeat -> showSeat.releaseIfExpired(now));
        List<ShowSeat> unavailableSeats = showSeats.stream()
                .filter(showSeat -> showSeat.getStatus() != com.ebooking.modules.inventory.ShowSeatStatus.HELD)
                .toList();
        if (!unavailableSeats.isEmpty()) {
            throw new ConflictException("Seat hold is no longer valid.");
        }

        UserAccount user = resolveUser(hold, userId);
        BigDecimal totalAmount = showSeats.stream()
                .map(ShowSeat::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Booking booking = bookingRepository.save(new Booking(
                UUID.randomUUID(),
                user,
                showSeats.get(0).getShow(),
                hold,
                totalAmount));
        hold.convert();

        bookingSeatRepository.saveAll(showSeats.stream()
                .map(showSeat -> new BookingSeat(
                        booking,
                        showSeat.getSeat(),
                        showSeat.getPrice(),
                        booking.getShow().getEvent().getTitle(),
                        booking.getShow().getStartsAt(),
                        showSeats.get(0).getShow().getVenue().getName(),
                        showSeat.getSeat().getSectionName() + "-" + showSeat.getSeat().getRowName()
                                + showSeat.getSeat().getSeatNumber()))
                .toList());

        return BookingResult.from(booking, bookingSeatRepository.findByBookingIdOrderBySeatLabelSnapshot(booking.getId()));
    }

    @Transactional
    public PaymentResult payBooking(UUID bookingId, UUID userId, String paymentMethod, String idempotencyKey) {
        Booking booking = bookingRepository.lockById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking was not found."));
        requireOwner(booking, userId);
        Instant now = clock.instant();
        if (booking.getStatus() == BookingStatus.PAID) {
            return PaymentResult.fromExisting(booking, paymentRepository.findByBookingId(bookingId).orElse(null));
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new ConflictException("Booking is not waiting for payment.");
        }
        if (booking.getExpiresAt() != null && !booking.getExpiresAt().isAfter(now)) {
            expireBooking(booking);
            throw new ConflictException("Booking has expired.");
        }

        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        if (normalizedKey != null) {
            var existingPayment = paymentRepository.findByIdempotencyKey(normalizedKey);
            if (existingPayment.isPresent()) {
                if (!existingPayment.get().getBooking().getId().equals(bookingId)) {
                    throw new ConflictException("Idempotency key was already used for another payment.");
                }
                return PaymentResult.fromPayment(booking, existingPayment.get());
            }
        }

        List<ShowSeat> showSeats = showSeatRepository.lockByHoldId(booking.getHold().getId());
        if (showSeats.isEmpty()) {
            throw new ConflictException("Booking does not have any held seats.");
        }

        PaymentProvider.PaymentAuthorization authorization = paymentProvider.authorize(
                paymentMethod,
                booking.getTotalAmount(),
                "VND");
        Payment payment = new Payment(
                UUID.randomUUID(),
                booking,
                authorization.provider(),
                authorization.providerReference(),
                booking.getTotalAmount(),
                "VND",
                normalizedKey);

        if (authorization.approved()) {
            payment.succeed();
            booking.markPaid();
            showSeats.forEach(ShowSeat::markSold);
            ticketService.issueForBooking(booking.getId());
            log.info("Booking payment succeeded: bookingId={}, paymentProvider={}",
                    bookingId, authorization.provider());
        } else {
            payment.fail();
            booking.cancel();
            booking.getHold().cancel();
            showSeats.forEach(ShowSeat::releaseToAvailable);
            log.info("Booking payment declined: bookingId={}, paymentProvider={}",
                    bookingId, authorization.provider());
        }

        paymentRepository.save(payment);
        return PaymentResult.fromPayment(booking, payment);
    }

    @Transactional
    public void cancelBooking(UUID bookingId, UUID userId) {
        Booking booking = bookingRepository.lockById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking was not found."));
        requireOwner(booking, userId);
        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
            List<ShowSeat> showSeats = showSeatRepository.lockByHoldId(booking.getHold().getId());
            booking.cancel();
            if (booking.getHold() != null) {
                booking.getHold().cancel();
            }
            showSeats.forEach(ShowSeat::releaseToAvailable);
        } else if (booking.getStatus() == BookingStatus.PAID) {
            ticketService.cancelTicketsForBooking(bookingId);
            List<ShowSeat> showSeats = showSeatRepository.lockByHoldId(booking.getHold().getId());
            booking.cancel();
            if (booking.getHold() != null) {
                booking.getHold().cancel();
            }
            showSeats.forEach(ShowSeat::releaseToAvailable);
            log.info("Paid booking cancelled successfully: bookingId={}", bookingId);
        } else {
            throw new ConflictException("Only pending or paid bookings can be cancelled.");
        }
    }

    @Transactional(readOnly = true)
    public List<MyBookingResult> getMyBookings(UUID userId) {
        List<Booking> bookings = bookingRepository.findByUserIdDetailed(userId);
        return bookings.stream().map(booking -> {
            List<BookingSeat> seats = bookingSeatRepository.findByBookingIdOrderBySeatLabelSnapshot(booking.getId());
            return MyBookingResult.from(booking, seats);
        }).toList();
    }

    @Scheduled(fixedDelayString = "30000")
    @Transactional
    public int expirePendingBookings() {
        Instant now = clock.instant();
        int expired = 0;
        var page = org.springframework.data.domain.PageRequest.of(0, 500);
        List<Booking> candidates;
        do {
            candidates = bookingRepository.findByStatusAndExpiresAtLessThanEqual(
                    BookingStatus.PENDING_PAYMENT, now, page).getContent();
            for (Booking booking : candidates) {
                Booking locked = bookingRepository.lockById(booking.getId()).orElse(null);
                if (locked != null && locked.getStatus() == BookingStatus.PENDING_PAYMENT) {
                    expireBooking(locked);
                    expired++;
                }
            }
            bookingRepository.flush();
        } while (candidates.size() == 500);
        return expired;
    }

    @Transactional(readOnly = true)
    public BookingResult getBooking(UUID bookingId, UUID userId) {
        Booking booking = bookingRepository.findOwnedById(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("Booking was not found."));
        return BookingResult.from(booking, bookingSeatRepository.findByBookingIdOrderBySeatLabelSnapshot(bookingId));
    }

    private void expireBooking(Booking booking) {
        booking.expire();
        if (booking.getHold() != null) {
            booking.getHold().expire();
            List<ShowSeat> showSeats = showSeatRepository.lockByHoldId(booking.getHold().getId());
            showSeats.forEach(ShowSeat::releaseToAvailable);
        }
    }

    private UserAccount resolveUser(SeatHold hold, UUID userId) {
        if (hold.getUser() != null && userId != null && !hold.getUser().getId().equals(userId)) {
            throw new ConflictException("Hold belongs to a different user.");
        }
        if (hold.getUser() != null) {
            return hold.getUser();
        }
        throw new ConflictException("Seat hold has no owner.");
    }

    private void requireOwner(Booking booking, UUID userId) {
        if (userId == null || booking.getUser() == null || !userId.equals(booking.getUser().getId())) {
            throw new NotFoundException("Booking was not found.");
        }
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

    public record BookingResult(
            UUID id,
            BookingStatus status,
            BigDecimal totalAmount,
            Instant expiresAt,
            List<BookingSeatResult> seats) {

        static BookingResult from(Booking booking, List<BookingSeat> seats) {
            return new BookingResult(
                    booking.getId(),
                    booking.getStatus(),
                    booking.getTotalAmount(),
                    booking.getExpiresAt(),
                    seats.stream()
                            .map(seat -> new BookingSeatResult(
                                    seat.getSeat().getId(),
                                    seat.getSeatLabelSnapshot(),
                                    seat.getPrice()))
                            .sorted(Comparator.comparing(BookingSeatResult::label))
                            .toList());
        }
    }

    public record BookingSeatResult(UUID seatId, String label, BigDecimal price) {
    }

    public record PaymentResult(
            UUID bookingId,
            BookingStatus bookingStatus,
            PaymentStatus paymentStatus,
            String provider,
            String providerReference,
            BigDecimal amount) {

        static PaymentResult fromPayment(Booking booking, Payment payment) {
            return new PaymentResult(
                    booking.getId(),
                    booking.getStatus(),
                    payment.getStatus(),
                    payment.getProvider(),
                    payment.getProviderReference(),
                    payment.getAmount());
        }

        static PaymentResult fromExisting(Booking booking, Payment payment) {
            if (payment == null) {
                return new PaymentResult(booking.getId(), booking.getStatus(), PaymentStatus.SUCCEEDED, null, null, booking.getTotalAmount());
            }
            return new PaymentResult(
                    booking.getId(),
                    booking.getStatus(),
                    payment.getStatus(),
                    payment.getProvider(),
                    payment.getProviderReference(),
                    payment.getAmount());
        }
    }

    public record MyBookingResult(
            UUID id,
            UUID holdId,
            BookingStatus status,
            BigDecimal totalAmount,
            Instant createdAt,
            Instant expiresAt,
            UUID eventId,
            String eventTitle,
            UUID showId,
            String venueName,
            Instant startsAt,
            Instant endsAt,
            List<BookingSeatResult> seats) {

        static MyBookingResult from(Booking booking, List<BookingSeat> seats) {
            var show = booking.getShow();
            return new MyBookingResult(
                    booking.getId(),
                    booking.getHold() != null ? booking.getHold().getId() : null,
                    booking.getStatus(),
                    booking.getTotalAmount(),
                    booking.getCreatedAt(),
                    booking.getExpiresAt(),
                    show != null && show.getEvent() != null ? show.getEvent().getId() : null,
                    show != null && show.getEvent() != null ? show.getEvent().getTitle() : "",
                    show != null ? show.getId() : null,
                    show != null && show.getVenue() != null ? show.getVenue().getName() : "",
                    show != null ? show.getStartsAt() : null,
                    show != null ? show.getEndsAt() : null,
                    seats.stream()
                            .map(seat -> new BookingSeatResult(
                                    seat.getSeat().getId(),
                                    seat.getSeatLabelSnapshot(),
                                    seat.getPrice()))
                            .sorted(Comparator.comparing(BookingSeatResult::label))
                            .toList());
        }
    }
}
