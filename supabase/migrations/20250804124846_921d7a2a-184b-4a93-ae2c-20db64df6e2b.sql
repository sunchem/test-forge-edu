-- Create table to store user credentials for school administration
CREATE TABLE public.user_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    password_plain TEXT NOT NULL, -- Store plain password for school admin access
    created_by UUID NOT NULL,
    school_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for user credentials
CREATE POLICY "School admins can view credentials in their school" 
ON public.user_credentials 
FOR SELECT 
USING (
    school_id = get_current_user_school() 
    AND get_current_user_role() IN ('admin', 'school_admin')
);

CREATE POLICY "School admins can insert credentials" 
ON public.user_credentials 
FOR INSERT 
WITH CHECK (
    get_current_user_role() IN ('admin', 'school_admin')
    AND created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage all credentials" 
ON public.user_credentials 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_credentials_updated_at
BEFORE UPDATE ON public.user_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();