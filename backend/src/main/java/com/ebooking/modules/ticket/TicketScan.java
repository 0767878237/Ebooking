package com.ebooking.modules.ticket;

import java.time.Instant;
import java.util.UUID;

import com.ebooking.modules.identity.UserAccount;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "ticket_scans")
public class TicketScan {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id")
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_user_id")
    private UserAccount staffUser;

    @Enumerated(EnumType.STRING)
    private TicketScanResult result;

    private Instant scannedAt;
    private String deviceId;
    private String note;

    protected TicketScan() {
    }

    public TicketScan(
            UUID id,
            Ticket ticket,
            UserAccount staffUser,
            TicketScanResult result,
            String deviceId,
            String note) {
        this.id = id;
        this.ticket = ticket;
        this.staffUser = staffUser;
        this.result = result;
        this.scannedAt = Instant.now();
        this.deviceId = deviceId;
        this.note = note;
    }
}
