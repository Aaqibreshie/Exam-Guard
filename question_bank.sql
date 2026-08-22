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
