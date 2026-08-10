-- Migration: 20260813_fix_activities_type_check_and_submission_integrity
-- Descrição: Ajusta a constraint de verificação de tipos de atividades em public.activities para aceitar
-- 'Trabalho em grupo' e 'Projeto de pesquisa', e assegura a integridade estrutural das entregas em public.submissions.

-- 1. Remover e redefinir a check constraint de tipos na tabela public.activities
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_type_check;

ALTER TABLE public.activities ADD CONSTRAINT activities_type_check 
  CHECK (type IN ('Simulado', 'Redação', 'Dinâmica', 'Avaliação', 'Trabalho em grupo', 'Projeto de pesquisa'));

-- 2. Assegurar a existência e tipos de todas as colunas na tabela public.submissions para gravação segura
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS essay_answer TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS selected_objective_answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS objective_score NUMERIC(4,2) DEFAULT 0.0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS max_objective_score NUMERIC(4,2) DEFAULT 5.0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS essay_score NUMERIC(4,2);
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS max_essay_score NUMERIC(4,2) DEFAULT 5.0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS extra_points NUMERIC(4,2) DEFAULT 0.0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS group_members TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS registered_in_state_system BOOLEAN DEFAULT false;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS return_count INT DEFAULT 0;

-- 3. Garantir permissões completas de acesso e RLS para o correto fluxo de gravação e consulta
GRANT ALL ON TABLE public.activities TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.submissions TO anon, authenticated, postgres, service_role;
