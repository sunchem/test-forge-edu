-- Use the Supabase admin API to create the admin user
-- This will be handled by the auth system automatically
-- For now, just ensure the profile exists for the admin user

-- First, let's insert the admin profile manually if it doesn't exist
INSERT INTO public.profiles (
  user_id,
  first_name,
  last_name,
  role
) VALUES (
  '999d12e1-4b7b-4620-a19c-658a0d99c81d',  -- This is the existing user ID from auth logs
  'Администратор',
  'Системы',
  'admin'::user_role
) ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin'::user_role,
  first_name = 'Администратор',
  last_name = 'Системы',
  updated_at = now();