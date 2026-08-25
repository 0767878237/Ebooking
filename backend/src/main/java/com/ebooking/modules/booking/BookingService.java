package com.ebooking.modules.booking;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import com.ebooking.modules.identity.UserAccount;
import com.ebooking.modules.identity.UserAccountRepository;
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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final ShowSeatRepository showSeatRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentProvider paymentProvider;
    private final UserAccountRepository userAccountRepository;
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
            UserAccountRepository userAccountRepository,
            TicketService ticketService) {
        this(bookingRepository, bookingSeatRepository, seatHoldRepository, showSeatRepository,
                paymentRepository, paymentProvider, userAccountRepository, ticketService, Clock.systemUTC());
    }

    BookingService(
            BookingRepository bookingRepository,
            BookingSeatRepository bookingSeatRepository,
            SeatHoldRepository seatHoldRepository,
            ShowSeatRepository showSeatRepository,
            PaymentRepository paymentRepository,
            PaymentProvider paymentProvider,
            UserAccountRepository userAccountRepository,
            TicketService ticketService,
            Clock clock) {
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.seatHoldRepository = seatHoldRepository;
        this.showSeatRepository = showSeatRepository;
        this.paymentRepository = paymentRepository;
        this.paymentProvider = paymentProvider;
        this.userAccountRepository = userAccountRepository;
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
    public PaymentResult payBooking(UUID bookingId, String paymentMethod, String idempotencyKey) {
        Booking booking = bookingRepository.lockById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking was not found."));
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
        } else {
            payment.fail();
            booking.cancel();
            booking.getHold().cancel();
            showSeats.forEach(ShowSeat::releaseToAvailable);
        }

        paymentRepository.save(payment);
        return PaymentResult.fromPayment(booking, payment);
    }

    @Transactional
    public void cancelBooking(UUID bookingId) {
        Booking booking = bookingRepository.lockById(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking was not found."));
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new ConflictException("Only pending bookings can be cancelled in MVP.");
        }

        List<ShowSeat> showSeats = showSeatRepository.lockByHoldId(booking.getHold().getId());
        booking.cancel();
        booking.getHold().cancel();
        showSeats.forEach(ShowSeat::releaseToAvailable);
    }

    @Scheduled(fixedDelayString = "30000")
    @Transactional
    public int expirePendingBookings() {
        Instant now = clock.instant();
        int expired = 0;
        for (Booking booking : bookingRepository.findByStatusAndExpiresAtLessThanEqual(
                BookingStatus.PENDING_PAYMENT, now)) {
            Booking locked = bookingRepository.lockById(booking.getId())
                    .orElse(null);
            if (locked == null || locked.getStatus() != BookingStatus.PENDING_PAYMENT) {
                continue;
            }
            expireBooking(locked);
            expired++;
        }
        return expired;
    }

    @Transactional
    public BookingResult getBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
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
        if (userId == null) {
            throw new ConflictException("User is required when the hold has no user.");
        }
        return userAccountRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User was not found."));
    }

    private static String normalizeIdempotencyKey(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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
}
