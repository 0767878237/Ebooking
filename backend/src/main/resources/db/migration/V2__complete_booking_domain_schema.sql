CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    description VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ
);

INSERT INTO roles (id, code, description)
VALUES
    (gen_random_uuid(), 'USER', 'Customer who purchases event tickets'),
    (gen_random_uuid(), 'ORGANIZER', 'User who manages events and shows'),
    (gen_random_uuid(), 'CHECK_IN_STAFF', 'Staff member who validates tickets at the gate'),
    (gen_random_uuid(), 'ADMIN', 'System administrator')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

ALTER TABLE users
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at TIMESTAMPTZ;

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles ON roles.code = users.role
ON CONFLICT DO NOTHING;

CREATE TABLE venue_sections (
    id UUID PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(id),
    name VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_venue_sections_name UNIQUE (venue_id, name)
);

ALTER TABLE venues
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE venue_seats RENAME TO seats;
ALTER TABLE seats
    ADD COLUMN section_id UUID;

INSERT INTO venue_sections (id, venue_id, name)
SELECT gen_random_uuid(), venue_id, section_name
FROM seats
GROUP BY venue_id, section_name;

UPDATE seats
SET section_id = venue_sections.id
FROM venue_sections
WHERE venue_sections.venue_id = seats.venue_id
  AND venue_sections.name = seats.section_name;

ALTER TABLE seats
    ALTER COLUMN section_id SET NOT NULL,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at TIMESTAMPTZ,
    ADD CONSTRAINT fk_seats_section FOREIGN KEY (section_id) REFERENCES venue_sections(id);

ALTER TABLE seats
    DROP CONSTRAINT uq_venue_seats_position,
    DROP COLUMN section_name,
    ADD CONSTRAINT uq_seats_position UNIQUE (venue_id, section_id, row_name, seat_number);

ALTER TABLE cities
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE TABLE genres (
    id UUID PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    slug VARCHAR(96) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ
);

INSERT INTO genres (id, name, slug)
SELECT gen_random_uuid(), category, lower(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g'))
FROM events
GROUP BY category
ON CONFLICT (name) DO NOTHING;

ALTER TABLE events
    ADD COLUMN genre_id UUID,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at TIMESTAMPTZ;

UPDATE events
SET genre_id = genres.id
FROM genres
WHERE genres.name = events.category;

ALTER TABLE events
    ALTER COLUMN genre_id SET NOT NULL,
    ADD CONSTRAINT fk_events_genre FOREIGN KEY (genre_id) REFERENCES genres(id);

ALTER TABLE shows
    ADD COLUMN status VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('DRAFT', 'SCHEDULED', 'CANCELLED', 'COMPLETED')),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE show_seats
    DROP CONSTRAINT IF EXISTS show_seats_status_check,
    DROP CONSTRAINT IF EXISTS chk_show_seats_hold;

UPDATE show_seats
SET status = 'SOLD'
WHERE status = 'BOOKED';

ALTER TABLE show_seats
    ADD COLUMN hold_token_hash VARCHAR(128),
    ADD COLUMN held_by UUID REFERENCES users(id),
    ADD COLUMN expires_at TIMESTAMPTZ,
    ADD COLUMN price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD CONSTRAINT chk_show_seats_status_v2 CHECK (status IN ('AVAILABLE', 'HELD', 'SOLD'));

ALTER TABLE show_seats
    ADD CONSTRAINT chk_show_seats_hold_v2 CHECK (
        (status = 'HELD' AND hold_id IS NOT NULL)
        OR (status IN ('AVAILABLE', 'SOLD') AND hold_id IS NULL)
    );

ALTER TABLE seat_holds
    ADD COLUMN hold_token_hash VARCHAR(128) UNIQUE,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE bookings
    ADD COLUMN booking_code VARCHAR(32) NOT NULL DEFAULT ('BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE bookings
    ADD CONSTRAINT uq_bookings_booking_code UNIQUE (booking_code);

ALTER TABLE booking_seats RENAME TO booking_items;
ALTER TABLE booking_items
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN event_title_snapshot VARCHAR(200),
    ADD COLUMN show_starts_at_snapshot TIMESTAMPTZ,
    ADD COLUMN venue_name_snapshot VARCHAR(180),
    ADD COLUMN seat_label_snapshot VARCHAR(80),
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

CREATE TABLE payments (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id),
    provider VARCHAR(40) NOT NULL,
    provider_reference VARCHAR(160) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    status VARCHAR(24) NOT NULL CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id),
    booking_item_seat_id UUID NOT NULL REFERENCES seats(id),
    ticket_code VARCHAR(64) NOT NULL UNIQUE,
    qr_token_hash VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(24) NOT NULL CHECK (status IN ('ISSUED', 'USED', 'CANCELLED')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE ticket_scans (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id),
    staff_user_id UUID NOT NULL REFERENCES users(id),
    result VARCHAR(24) NOT NULL CHECK (result IN ('ACCEPTED', 'ALREADY_USED', 'INVALID', 'CANCELLED')),
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_id VARCHAR(120),
    note VARCHAR(255)
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id),
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    correlation_id VARCHAR(80),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'users', 'cities', 'venues', 'venue_sections', 'seats', 'genres',
        'events', 'shows', 'show_seats', 'seat_holds', 'bookings',
        'booking_items', 'payments', 'tickets', 'refresh_tokens', 'roles'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            'trg_' || table_name || '_updated_at',
            table_name
        );
    END LOOP;
END $$;

CREATE INDEX idx_cities_name ON cities(name);
CREATE INDEX idx_venues_name_trgm ON venues USING gin (name gin_trgm_ops);
CREATE INDEX idx_venues_address_trgm ON venues USING gin (address gin_trgm_ops);
CREATE INDEX idx_venue_sections_venue_id ON venue_sections(venue_id);
CREATE INDEX idx_seats_venue_section ON seats(venue_id, section_id);
CREATE INDEX idx_genres_slug ON genres(slug);
CREATE INDEX idx_events_genre_id ON events(genre_id);
CREATE INDEX idx_events_title_trgm ON events USING gin (title gin_trgm_ops);
CREATE INDEX idx_events_description_trgm ON events USING gin (description gin_trgm_ops);
CREATE INDEX idx_shows_starts_at_status ON shows(starts_at, status);
CREATE INDEX idx_show_seats_status ON show_seats(show_id, status);
CREATE INDEX idx_show_seats_expires_at ON show_seats(expires_at) WHERE status = 'HELD';
CREATE INDEX idx_bookings_status_user_id ON bookings(status, user_id);
CREATE INDEX idx_bookings_show_id ON bookings(show_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX idx_ticket_scans_ticket_id ON ticket_scans(ticket_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at);
CREATE INDEX idx_audit_logs_correlation_id ON audit_logs(correlation_id);

CREATE INDEX idx_events_full_text
    ON events USING gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));
