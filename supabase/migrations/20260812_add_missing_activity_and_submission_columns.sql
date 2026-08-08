-- Migration: 20260812_add_missing_activity_and_submission_columns
-- Adicionar colunas de suporte a questões, materiais, notas máximas e trabalhos em grupo na tabela activities e submissions

-- 1. Colunas adicionais na tabela public.activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'Sociologia';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS support_material TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS max_grade NUMERIC(4,2) DEFAULT 10.0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS allow_group_work BOOLEAN DEFAULT false;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;

-- 2. Colunas adicionais na tabela public.submissions
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS extra_points NUMERIC(4,2) DEFAULT 0.0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS selected_objective_answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS registered_in_state_system BOOLEAN DEFAULT false;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS group_members TEXT;

-- 3. Atualizar permissões e RLS
GRANT ALL ON TABLE public.activities TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.submissions TO anon, authenticated, postgres, service_role;
