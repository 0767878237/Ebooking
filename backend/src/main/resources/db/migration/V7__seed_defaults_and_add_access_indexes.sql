INSERT INTO genres (id, name, slug)
VALUES (gen_random_uuid(), 'Music', 'music')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_events_published_deleted_created_at
    ON events(published, deleted_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_title_lower_trgm
    ON events USING gin (lower(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_events_description_lower_trgm
    ON events USING gin (lower(description) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_shows_event_starts_at
    ON shows(event_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_bookings_status_expires_at
    ON bookings(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_bookings_user_created_at
    ON bookings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking_label
    ON booking_items(booking_id, seat_label_snapshot);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tickets_booking_seat
    ON tickets(booking_id, booking_item_seat_id);

CREATE INDEX IF NOT EXISTS idx_venues_city_deleted_name
    ON venues(city_id, deleted_at, name);

CREATE INDEX IF NOT EXISTS idx_cities_deleted_name
    ON cities(deleted_at, name);

CREATE INDEX IF NOT EXISTS idx_genres_deleted_name
    ON genres(deleted_at, name);
