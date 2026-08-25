CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('USER', 'ORGANIZER', 'CHECK_IN_STAFF', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cities (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venues (
    id UUID PRIMARY KEY,
    city_id UUID NOT NULL REFERENCES cities(id),
    name VARCHAR(180) NOT NULL,
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_venues_city_name UNIQUE (city_id, name)
);

CREATE TABLE venue_seats (
    id UUID PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(id),
    section_name VARCHAR(60) NOT NULL,
    row_name VARCHAR(20) NOT NULL,
    seat_number INTEGER NOT NULL CHECK (seat_number > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_venue_seats_position UNIQUE (venue_id, section_name, row_name, seat_number)
);

CREATE TABLE events (
    id UUID PRIMARY KEY,
    organizer_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shows (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id),
    venue_id UUID NOT NULL REFERENCES venues(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_shows_schedule CHECK (ends_at > starts_at)
);

CREATE TABLE seat_holds (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    status VARCHAR(24) NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE show_seats (
    show_id UUID NOT NULL REFERENCES shows(id),
    seat_id UUID NOT NULL REFERENCES venue_seats(id),
    status VARCHAR(24) NOT NULL CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED')),
    hold_id UUID REFERENCES seat_holds(id),
    version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (show_id, seat_id),
    CONSTRAINT chk_show_seats_hold CHECK (
        (status = 'HELD' AND hold_id IS NOT NULL)
        OR (status IN ('AVAILABLE', 'BOOKED'))
    )
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    show_id UUID NOT NULL REFERENCES shows(id),
    status VARCHAR(24) NOT NULL CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED')),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ
);

CREATE TABLE booking_seats (
    booking_id UUID NOT NULL REFERENCES bookings(id),
    seat_id UUID NOT NULL REFERENCES venue_seats(id),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    PRIMARY KEY (booking_id, seat_id)
);

CREATE INDEX idx_venues_city_id ON venues(city_id);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_published_category ON events(published, category);
CREATE INDEX idx_shows_event_id ON shows(event_id);
CREATE INDEX idx_shows_venue_starts_at ON shows(venue_id, starts_at);
CREATE INDEX idx_seat_holds_expires_at ON seat_holds(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_show_seats_hold_id ON show_seats(hold_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);

