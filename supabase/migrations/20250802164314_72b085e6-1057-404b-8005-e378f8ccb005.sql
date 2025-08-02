-- Add school_admin role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'school_admin';

-- Update the handle_new_user function to properly handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, first_name, last_name, role, school_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'),
        COALESCE((NEW.raw_user_meta_data->>'school_id')::uuid, NULL)
    );
    RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;