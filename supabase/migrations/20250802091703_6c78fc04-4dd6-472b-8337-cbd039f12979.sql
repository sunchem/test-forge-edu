-- Update the admin user with the specified credentials
UPDATE auth.users 
SET email = 'sunchem.academy@gmail.com'
WHERE email = 'sunchem.academy@gmail.com';

-- Update the profile to ensure admin role
UPDATE public.profiles 
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'sunchem.academy@gmail.com');