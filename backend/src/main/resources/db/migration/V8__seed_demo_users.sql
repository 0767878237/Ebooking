INSERT INTO users (id, email, display_name, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'customer@ebooking.local', 'E Booking Customer', 'USER'),
    ('00000000-0000-0000-0000-000000000002', 'organizer@ebooking.local', 'E Booking Organizer', 'ORGANIZER'),
    ('00000000-0000-0000-0000-000000000003', 'staff@ebooking.local', 'E Booking Staff', 'CHECK_IN_STAFF'),
    ('00000000-0000-0000-0000-000000000004', 'admin@ebooking.local', 'E Booking Admin', 'ADMIN')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles ON roles.code = users.role
WHERE users.email IN (
    'customer@ebooking.local',
    'organizer@ebooking.local',
    'staff@ebooking.local',
    'admin@ebooking.local'
)
ON CONFLICT DO NOTHING;
