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
