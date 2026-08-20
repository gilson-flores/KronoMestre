-- Migration: 20260824_create_atestados_rad_table.sql
-- Descrição: Cria a tabela atestados_rad para persistência completa de atestados médicos e afastamentos RAD na nuvem (Supabase).

CREATE TABLE IF NOT EXISTS public.atestados_rad (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_turma TEXT,
    data_falta TEXT NOT NULL,
    data_atestado TEXT NOT NULL,
    dias_atestado INT NOT NULL DEFAULT 1,
    data_final TEXT NOT NULL,
    motivo TEXT,
    tipo TEXT CHECK (tipo IN ('Atestado', 'RAD')) DEFAULT 'Atestado',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_atestados_rad_student_id ON public.atestados_rad(student_id);
CREATE INDEX IF NOT EXISTS idx_atestados_rad_created_at ON public.atestados_rad(created_at DESC);

-- Habilitar RLS e criar política de acesso total
ALTER TABLE public.atestados_rad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total atestados_rad" ON public.atestados_rad;
CREATE POLICY "Acesso total atestados_rad" ON public.atestados_rad FOR ALL TO public USING (true) WITH CHECK (true);

-- Conceder permissões para todas as roles
GRANT ALL ON TABLE public.atestados_rad TO anon, authenticated, postgres, service_role;
