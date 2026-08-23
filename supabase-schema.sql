-- ============================================
-- ExamGuard Database Schema & Non-Recursive RLS
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Profiles table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('teacher', 'student', 'admin')),
  subject TEXT CHECK (subject IN ('mern', 'git')),
  batch TEXT DEFAULT 'Batch 1 (Morning)',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure batch column exists if table was already created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS batch TEXT DEFAULT 'Batch 1 (Morning)';

-- 2. Exams table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL CHECK (subject IN ('mern', 'git')),
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT false,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  max_warnings INTEGER DEFAULT 3,
  access_type TEXT DEFAULT 'all' CHECK (access_type IN ('all', 'batch', 'selected')),
  allowed_batch TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure new columns exist if table was already created
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'all';
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS allowed_batch TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS require_phone_sidecar BOOLEAN DEFAULT false;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS require_webcam BOOLEAN DEFAULT true;

-- 3. Exam Candidates Table (Selected Students for an Exam)
CREATE TABLE IF NOT EXISTS public.exam_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- 4. Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'short_answer', 'project', 'coding')),
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  starter_code TEXT,
  test_cases JSONB DEFAULT '[]'::jsonb
);

-- Ensure questions table columns exist if created earlier
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS starter_code TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS test_cases JSONB DEFAULT '[]'::jsonb;


-- 5. Submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score INTEGER DEFAULT 0,
  total_possible INTEGER DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'expelled')),
  warning_count INTEGER DEFAULT 0,
  auto_submitted BOOLEAN DEFAULT false,
  UNIQUE(exam_id, student_id)
);

-- 6. Answers table
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0
);

-- 7. Cheat logs table
CREATE TABLE IF NOT EXISTS public.cheat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Clean Up Old Policies (Drop previous policies)
-- ============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;

DROP POLICY IF EXISTS "Teachers can manage own exams" ON public.exams;
DROP POLICY IF EXISTS "Students can view published exams for their subject" ON public.exams;
DROP POLICY IF EXISTS "Teachers manage own exams" ON public.exams;
DROP POLICY IF EXISTS "Students view published exams" ON public.exams;

DROP POLICY IF EXISTS "Teachers manage questions" ON public.questions;
DROP POLICY IF EXISTS "Students view questions" ON public.questions;

DROP POLICY IF EXISTS "Students manage own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers view submissions" ON public.submissions;

DROP POLICY IF EXISTS "Students manage own answers" ON public.answers;
DROP POLICY IF EXISTS "Teachers view answers" ON public.answers;

DROP POLICY IF EXISTS "Students insert cheat logs" ON public.cheat_logs;
DROP POLICY IF EXISTS "Teachers view cheat logs" ON public.cheat_logs;

DROP POLICY IF EXISTS "Teachers manage exam candidates" ON public.exam_candidates;
DROP POLICY IF EXISTS "Students view exam candidates" ON public.exam_candidates;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheat_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Non-Recursive, Optimized RLS Policies
-- ============================================

-- Profiles Policies
CREATE POLICY "Allow authenticated users to read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Exams Policies
CREATE POLICY "Teachers manage own exams" ON public.exams
  FOR ALL TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Students view published exams" ON public.exams
  FOR SELECT TO authenticated USING (is_published = true);

-- Exam Candidates Policies
CREATE POLICY "Teachers manage exam candidates" ON public.exam_candidates
  FOR ALL TO authenticated USING (
    exam_id IN (SELECT id FROM public.exams WHERE created_by = auth.uid())
  );

CREATE POLICY "Students view exam candidates" ON public.exam_candidates
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- Questions Policies
CREATE POLICY "Teachers manage questions" ON public.questions
  FOR ALL TO authenticated USING (
    exam_id IN (SELECT id FROM public.exams WHERE created_by = auth.uid())
  );

CREATE POLICY "Students view questions" ON public.questions
  FOR SELECT TO authenticated USING (
    exam_id IN (SELECT id FROM public.exams WHERE is_published = true)
  );

-- Submissions Policies
CREATE POLICY "Students manage own submissions" ON public.submissions
  FOR ALL TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Teachers view submissions" ON public.submissions
  FOR SELECT TO authenticated USING (
    exam_id IN (SELECT id FROM public.exams WHERE created_by = auth.uid())
  );

-- Answers Policies
CREATE POLICY "Students manage own answers" ON public.answers
  FOR ALL TO authenticated USING (
    submission_id IN (SELECT id FROM public.submissions WHERE student_id = auth.uid())
  );

CREATE POLICY "Teachers view answers" ON public.answers
  FOR SELECT TO authenticated USING (
    submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.exams e ON s.exam_id = e.id
      WHERE e.created_by = auth.uid()
    )
  );

-- Cheat Logs Policies
CREATE POLICY "Students insert cheat logs" ON public.cheat_logs
  FOR INSERT TO authenticated WITH CHECK (
    submission_id IN (SELECT id FROM public.submissions WHERE student_id = auth.uid())
  );

CREATE POLICY "Teachers view cheat logs" ON public.cheat_logs
  FOR SELECT TO authenticated USING (
    submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.exams e ON s.exam_id = e.id
      WHERE e.created_by = auth.uid()
    )
  );

-- ============================================
-- Trigger: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, subject, batch)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'subject',
    COALESCE(NEW.raw_user_meta_data->>'batch', 'Batch 1 (Morning)')
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      subject = EXCLUDED.subject,
      batch = COALESCE(EXCLUDED.batch, profiles.batch);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Function: Auto calculate exam total marks
-- ============================================
CREATE OR REPLACE FUNCTION public.update_exam_total_marks()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.exams 
  SET total_marks = (
    SELECT COALESCE(SUM(points), 0) 
    FROM public.questions 
    WHERE exam_id = COALESCE(NEW.exam_id, OLD.exam_id)
  )
  WHERE id = COALESCE(NEW.exam_id, OLD.exam_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_question_change ON public.questions;

CREATE TRIGGER on_question_change
  AFTER INSERT OR UPDATE OR DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_exam_total_marks();
-- Create question_bank table
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  subject TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  starter_code TEXT,
  test_cases JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own banked questions
CREATE POLICY "Teachers manage own banked questions" ON public.question_bank
  FOR ALL TO authenticated USING (auth.uid() = created_by);

-- Students can read banked questions (for future LeetCode practice arena)
CREATE POLICY "Students can view banked questions" ON public.question_bank
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'student'
    )
  );
-- Add difficulty column to question_bank
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium';

-- Create practice_attempts table
CREATE TABLE IF NOT EXISTS public.practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE,
  code_submitted TEXT,
  is_correct BOOLEAN DEFAULT false,
  runtime_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;

-- Students manage own practice attempts
CREATE POLICY "Students manage own practice attempts" ON public.practice_attempts
  FOR ALL TO authenticated USING (auth.uid() = student_id);

-- Teachers view all practice attempts
CREATE POLICY "Teachers view all practice attempts" ON public.practice_attempts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'teacher' OR profiles.role = 'admin')
    )
  );
