package com.ebooking.api;

import java.time.OffsetDateTime;

import com.ebooking.api.dto.StatusResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {

    @GetMapping("/api/ping")
    public StatusResponse ping() {
        return new StatusResponse("ebooking-backend", "ok", OffsetDateTime.now().toString());
    }
}

