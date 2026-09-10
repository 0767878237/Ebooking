package com.ebooking.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.ebooking.config.CurrentUserService;
import com.ebooking.modules.booking.BookingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final CurrentUserService currentUserService;

    public BookingController(BookingService bookingService, CurrentUserService currentUserService) {
        this.bookingService = bookingService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<MyBookingResponse> getMyBookings() {
        return bookingService.getMyBookings(currentUserService.requireUserId()).stream()
                .map(MyBookingResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(@Valid @RequestBody CreateBookingRequest request) {
        BookingService.BookingResult result = bookingService.createBooking(
                request.holdId(), currentUserService.requireUserId());
        return BookingResponse.from(result);
    }

    @GetMapping("/{bookingId}")
    public BookingResponse get(@PathVariable UUID bookingId) {
        return BookingResponse.from(bookingService.getBooking(bookingId, currentUserService.requireUserId()));
    }

    @PostMapping("/{bookingId}/payment")
    public PaymentResponse pay(
            @PathVariable UUID bookingId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody PaymentRequest request) {
        BookingService.PaymentResult result = bookingService.payBooking(
                bookingId, currentUserService.requireUserId(), request.paymentMethod(), idempotencyKey);
        return PaymentResponse.from(result);
    }

    @PostMapping("/{bookingId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable UUID bookingId) {
        bookingService.cancelBooking(bookingId, currentUserService.requireUserId());
    }

    public record CreateBookingRequest(@NotNull UUID holdId) {
    }

    public record PaymentRequest(@NotBlank @Size(max = 40) String paymentMethod) {
    }

    public record BookingResponse(
            UUID id,
            String status,
            BigDecimal totalAmount,
            Instant expiresAt,
            List<BookingSeatResponse> seats) {

        static BookingResponse from(BookingService.BookingResult result) {
            return new BookingResponse(
                    result.id(),
                    result.status().name(),
                    result.totalAmount(),
                    result.expiresAt(),
                    result.seats().stream()
                            .map(seat -> new BookingSeatResponse(seat.seatId(), seat.label(), seat.price()))
                            .toList());
        }
    }

    public record BookingSeatResponse(UUID seatId, String label, BigDecimal price) {
    }

    public record PaymentResponse(
            UUID bookingId,
            String bookingStatus,
            String paymentStatus,
            String provider,
            String providerReference,
            BigDecimal amount) {

        static PaymentResponse from(BookingService.PaymentResult result) {
            return new PaymentResponse(
                    result.bookingId(),
                    result.bookingStatus().name(),
                    result.paymentStatus().name(),
                    result.provider(),
                    result.providerReference(),
                    result.amount());
        }
    }

    public record MyBookingResponse(
            UUID id,
            UUID holdId,
            String status,
            BigDecimal totalAmount,
            Instant createdAt,
            Instant expiresAt,
            UUID eventId,
            String eventTitle,
            UUID showId,
            String venueName,
            Instant startsAt,
            Instant endsAt,
            List<BookingSeatResponse> seats) {

        static MyBookingResponse from(BookingService.MyBookingResult result) {
            return new MyBookingResponse(
                    result.id(),
                    result.holdId(),
                    result.status().name(),
                    result.totalAmount(),
                    result.createdAt(),
                    result.expiresAt(),
                    result.eventId(),
                    result.eventTitle(),
                    result.showId(),
                    result.venueName(),
                    result.startsAt(),
                    result.endsAt(),
                    result.seats().stream()
                            .map(seat -> new BookingSeatResponse(seat.seatId(), seat.label(), seat.price()))
                            .toList());
        }
    }
}
