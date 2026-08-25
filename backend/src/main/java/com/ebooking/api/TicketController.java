package com.ebooking.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.ebooking.modules.ticket.TicketScanResult;
import com.ebooking.modules.ticket.TicketService;
import com.ebooking.modules.ticket.TicketStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping("/bookings/{bookingId}/tickets")
    public List<TicketResponse> findByBooking(@PathVariable UUID bookingId) {
        return ticketService.findByBooking(bookingId).stream().map(TicketResponse::from).toList();
    }

    @PostMapping("/checkin/scans")
    public ScanResponse scan(@Valid @RequestBody ScanRequest request) {
        TicketService.ScanResult result = ticketService.scan(
                request.staffUserId(), request.qrPayload(), request.deviceId(), request.note());
        return new ScanResponse(result.ticketCode(), result.result(), result.usedAt());
    }

    public record ScanRequest(
            @NotNull UUID staffUserId,
            @NotBlank @Size(max = 128) String qrPayload,
            @Size(max = 120) String deviceId,
            @Size(max = 255) String note) {
    }

    public record TicketResponse(
            UUID id,
            UUID bookingId,
            UUID seatId,
            String ticketCode,
            String qrPayload,
            TicketStatus status,
            Instant issuedAt,
            Instant usedAt) {

        static TicketResponse from(TicketService.TicketResult result) {
            return new TicketResponse(
                    result.id(),
                    result.bookingId(),
                    result.seatId(),
                    result.ticketCode(),
                    result.qrPayload(),
                    result.status(),
                    result.issuedAt(),
                    result.usedAt());
        }
    }

    public record ScanResponse(String ticketCode, TicketScanResult result, Instant usedAt) {
    }
}
