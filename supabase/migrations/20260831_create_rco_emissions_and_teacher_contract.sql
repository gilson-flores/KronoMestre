-- Migration: 20260831_create_rco_emissions_and_teacher_contract.sql
-- Descrição: Cria a tabela de registro eterno e imutável de emissões do RCO (Audit Trail / Snapshot) 
--            e adiciona campos de vigência de contrato (início, fim, tipo e matrícula funcional) à tabela de professores.

-- 1. Criar a tabela rco_emissions para persistência eterna e imutável
CREATE TABLE IF NOT EXISTS public.rco_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emission_hash TEXT UNIQUE NOT NULL,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'Sociologia',
  school TEXT NOT NULL DEFAULT 'EEB Prof. Jandira D''Ávila',
  scope TEXT NOT NULL DEFAULT 'all', -- 'all' ou 'single'
  turma TEXT DEFAULT NULL, -- nome da turma quando escopo for 'single'
  total_students INT DEFAULT 0,
  total_activities INT DEFAULT 0,
  turmas_summary JSONB DEFAULT '[]'::jsonb, -- resumo de médias e estatísticas por turma
  full_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, -- snapshot completo com todos os alunos, atividades e notas consolidadas
  emitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices de consulta para auditoria e histórico de emissões
CREATE INDEX IF NOT EXISTS idx_rco_emissions_teacher_id ON public.rco_emissions (teacher_id);
CREATE INDEX IF NOT EXISTS idx_rco_emissions_school ON public.rco_emissions (school);
CREATE INDEX IF NOT EXISTS idx_rco_emissions_emitted_at ON public.rco_emissions (emitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_rco_emissions_hash ON public.rco_emissions (emission_hash);

-- 3. Adicionar campos de vigência contratual e matrícula na tabela teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS matricula_funcional TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS contract_start_date DATE DEFAULT NULL;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS contract_end_date DATE DEFAULT NULL;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'ACT / Contratado';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'ativo';

-- 4. Permissões
GRANT ALL ON TABLE public.rco_emissions TO anon, authenticated, postgres, service_role;
