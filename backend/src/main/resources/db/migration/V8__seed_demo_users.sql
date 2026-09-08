INSERT INTO users (id, email, display_name, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'customer@ebooking.local', 'E Booking Customer', 'USER'),
    ('00000000-0000-0000-0000-000000000002', 'organizer@ebooking.local', 'E Booking Organizer', 'ORGANIZER'),
    ('00000000-0000-0000-0000-000000000003', 'staff@ebooking.local', 'E Booking Staff', 'CHECK_IN_STAFF'),
    ('00000000-0000-0000-0000-000000000004', 'admin@ebooking.local', 'E Booking Admin', 'ADMIN')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
JOIN roles ON roles.code = users.role
WHERE users.id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004'
)
ON CONFLICT DO NOTHING;
