-- Sets default BCrypt password hash ('password123') for local demo/test accounts
UPDATE users
SET password_hash = '$2a$10$FputULWOZlnAreFyOZD2Q.7YvcTA5dVRsHyCwYcGKc3teFyoB3vwm'
WHERE email IN (
    'customer@ebooking.local',
    'organizer@ebooking.local',
    'staff@ebooking.local',
    'admin@ebooking.local'
) AND (password_hash IS NULL OR password_hash = '');
