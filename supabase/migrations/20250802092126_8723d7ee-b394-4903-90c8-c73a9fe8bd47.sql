-- Create the admin user account
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmed_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'sunchem.academy@gmail.com',
  crypt('9095868R&o', gen_salt('bf')),
  now(),
  now(),
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  updated_at = now();

-- Create or update the admin profile
INSERT INTO public.profiles (
  user_id,
  first_name,
  last_name,
  role
) 
SELECT 
  id,
  'Администратор',
  'Системы',
  'admin'::user_role
FROM auth.users 
WHERE email = 'sunchem.academy@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin'::user_role,
  updated_at = now();