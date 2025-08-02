-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'teacher', 'student');

-- Create enum for question types
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'true_false', 'text');

-- Create schools table
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'student',
    class_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade INTEGER,
    subject TEXT,
    academic_year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tests table
CREATE TABLE public.tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER,
    total_questions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    allow_retake BOOLEAN DEFAULT false,
    academic_year TEXT NOT NULL,
    quarter TEXT CHECK (quarter IN ('1', '2', '3', '4')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type public.question_type NOT NULL DEFAULT 'multiple_choice',
    question_order INTEGER NOT NULL,
    points INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create question options table
CREATE TABLE public.question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    option_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test assignments table (which students are assigned to which tests)
CREATE TABLE public.test_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    UNIQUE(test_id, student_id)
);

-- Create test attempts table
CREATE TABLE public.test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    percentage_score DECIMAL(5,2),
    is_completed BOOLEAN DEFAULT false,
    academic_year TEXT NOT NULL,
    quarter TEXT CHECK (quarter IN ('1', '2', '3', '4'))
);

-- Create student answers table
CREATE TABLE public.student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES public.question_options(id),
    text_answer TEXT,
    is_correct BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to get current user school
CREATE OR REPLACE FUNCTION public.get_current_user_school()
RETURNS UUID AS $$
  SELECT school_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for schools (admin can manage all, others can view their school)
CREATE POLICY "Admins can manage all schools" ON public.schools
    FOR ALL USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Users can view their school" ON public.schools
    FOR SELECT USING (id = public.get_current_user_school());

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their school" ON public.profiles
    FOR SELECT USING (
        school_id = public.get_current_user_school() OR 
        public.get_current_user_role() = 'admin'
    );

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

-- RLS Policies for classes
CREATE POLICY "School users can view classes" ON public.classes
    FOR SELECT USING (school_id = public.get_current_user_school());

CREATE POLICY "Teachers can manage their classes" ON public.classes
    FOR ALL USING (
        teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
        public.get_current_user_role() = 'admin'
    );

-- RLS Policies for tests
CREATE POLICY "School users can view tests" ON public.tests
    FOR SELECT USING (school_id = public.get_current_user_school());

CREATE POLICY "Teachers can manage their tests" ON public.tests
    FOR ALL USING (
        teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
        public.get_current_user_role() = 'admin'
    );

-- RLS Policies for questions
CREATE POLICY "School users can view questions" ON public.questions
    FOR SELECT USING (
        test_id IN (
            SELECT id FROM public.tests 
            WHERE school_id = public.get_current_user_school()
        )
    );

CREATE POLICY "Teachers can manage questions" ON public.questions
    FOR ALL USING (
        test_id IN (
            SELECT id FROM public.tests 
            WHERE teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        ) OR public.get_current_user_role() = 'admin'
    );

-- RLS Policies for question options
CREATE POLICY "School users can view options" ON public.question_options
    FOR SELECT USING (
        question_id IN (
            SELECT q.id FROM public.questions q
            JOIN public.tests t ON q.test_id = t.id
            WHERE t.school_id = public.get_current_user_school()
        )
    );

CREATE POLICY "Teachers can manage options" ON public.question_options
    FOR ALL USING (
        question_id IN (
            SELECT q.id FROM public.questions q
            JOIN public.tests t ON q.test_id = t.id
            WHERE t.teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        ) OR public.get_current_user_role() = 'admin'
    );

-- RLS Policies for test assignments
CREATE POLICY "Teachers can manage assignments" ON public.test_assignments
    FOR ALL USING (
        test_id IN (
            SELECT id FROM public.tests 
            WHERE teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        ) OR public.get_current_user_role() = 'admin'
    );

CREATE POLICY "Students can view their assignments" ON public.test_assignments
    FOR SELECT USING (
        student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

-- RLS Policies for test attempts
CREATE POLICY "Students can manage their attempts" ON public.test_attempts
    FOR ALL USING (
        student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Teachers can view attempts for their tests" ON public.test_attempts
    FOR SELECT USING (
        test_id IN (
            SELECT id FROM public.tests 
            WHERE teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        ) OR public.get_current_user_role() = 'admin'
    );

-- RLS Policies for student answers
CREATE POLICY "Students can manage their answers" ON public.student_answers
    FOR ALL USING (
        attempt_id IN (
            SELECT id FROM public.test_attempts 
            WHERE student_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Teachers can view answers for their tests" ON public.student_answers
    FOR SELECT USING (
        attempt_id IN (
            SELECT ta.id FROM public.test_attempts ta
            JOIN public.tests t ON ta.test_id = t.id
            WHERE t.teacher_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        ) OR public.get_current_user_role() = 'admin'
    );

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, first_name, last_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tests_updated_at
    BEFORE UPDATE ON public.tests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();