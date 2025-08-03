-- Update RLS policies to support school_admin role

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view profiles in their school" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in their school" 
ON public.profiles 
FOR SELECT 
USING (
  (school_id = get_current_user_school()) 
  OR (get_current_user_role() IN ('admin', 'school_admin'))
);

CREATE POLICY "Admins and school admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  get_current_user_role() IN ('admin', 'school_admin')
);

-- Update schools policies
DROP POLICY IF EXISTS "Users can view their school" ON public.schools;

CREATE POLICY "Users can view their school" 
ON public.schools 
FOR SELECT 
USING (
  (id = get_current_user_school()) 
  OR (get_current_user_role() = 'admin')
);

-- Update tests policies
DROP POLICY IF EXISTS "School users can view tests" ON public.tests;
DROP POLICY IF EXISTS "Teachers can manage their tests" ON public.tests;

CREATE POLICY "School users can view tests" 
ON public.tests 
FOR SELECT 
USING (
  (school_id = get_current_user_school()) 
  OR (get_current_user_role() = 'admin')
);

CREATE POLICY "Teachers and school admins can manage tests" 
ON public.tests 
FOR ALL 
USING (
  (teacher_id = (SELECT id FROM profiles WHERE user_id = auth.uid())) 
  OR (get_current_user_role() IN ('admin', 'school_admin'))
);

-- Update classes policies  
DROP POLICY IF EXISTS "School users can view classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can manage their classes" ON public.classes;

CREATE POLICY "School users can view classes" 
ON public.classes 
FOR SELECT 
USING (
  (school_id = get_current_user_school()) 
  OR (get_current_user_role() = 'admin')
);

CREATE POLICY "Teachers and school admins can manage classes" 
ON public.classes 
FOR ALL 
USING (
  (teacher_id = (SELECT id FROM profiles WHERE user_id = auth.uid())) 
  OR (get_current_user_role() IN ('admin', 'school_admin'))
);