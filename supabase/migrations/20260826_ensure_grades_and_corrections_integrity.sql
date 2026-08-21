-- Migration: 20260826_ensure_grades_and_corrections_integrity.sql
-- Descrição: Assegura a integridade total de notas, médias, pontuações extras e status de correção para atividades e submissões no Supabase.

-- 1. Assegurar colunas de notas e métricas na tabela activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS average_grade NUMERIC(4, 2) DEFAULT 0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS max_grade NUMERIC(4, 2) DEFAULT 10;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS pending_correction INT DEFAULT 0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS total_submissions INT DEFAULT 0;

-- 2. Assegurar colunas completas de notas na tabela submissions
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS objective_score NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS max_objective_score NUMERIC(5, 2) DEFAULT 5;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS essay_score NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS max_essay_score NUMERIC(5, 2) DEFAULT 5;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS extra_points NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS teacher_feedback TEXT DEFAULT '';
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS registered_in_state_system BOOLEAN DEFAULT false;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS return_count INT DEFAULT 0;

-- 3. Índices para performance e consultas instantâneas de notas e correções
CREATE INDEX IF NOT EXISTS idx_submissions_activity_student ON public.submissions (activity_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions (status);

-- 4. Garantir permissões completas
GRANT ALL ON TABLE public.activities TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.submissions TO anon, authenticated, postgres, service_role;
