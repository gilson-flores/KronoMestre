-- Migration: 20260822_ensure_pne_second_teacher_persistence.sql
-- Descrição: Garante suporte robusto a vínculos de 2º Professor e condições PNE nas tabelas students, second_teachers e inclusion_records.

-- 1. Tabela second_teachers (garante que existe com todas as colunas)
CREATE TABLE IF NOT EXISTS public.second_teachers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'AEE / Inclusão Escolar',
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    school TEXT,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.second_teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.second_teachers ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE public.second_teachers ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Tabela students (garante colunas de 2º Professor e PNE)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    full_name TEXT NOT NULL,
    turma TEXT NOT NULL,
    matricula TEXT UNIQUE NOT NULL,
    tag TEXT CHECK (tag IN ('REGULAR', 'PNE', 'RAD')) DEFAULT 'REGULAR',
    password_hash TEXT NOT NULL DEFAULT '1234',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS second_teacher_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS second_teacher_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS pne_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS pedagogical_notes TEXT DEFAULT '';

-- 3. RLS e Permissões irrestritas para sincronização contínua
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total alunos" ON public.students;
CREATE POLICY "Acesso total alunos" ON public.students FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.second_teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total segundo professor" ON public.second_teachers;
CREATE POLICY "Acesso total segundo professor" ON public.second_teachers FOR ALL TO public USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.students TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.second_teachers TO anon, authenticated, postgres, service_role;

-- 4. Tabela de registros de inclusão (se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'inclusion_records'
    ) THEN
        ALTER TABLE public.inclusion_records ADD COLUMN IF NOT EXISTS second_teacher_id TEXT;
        ALTER TABLE public.inclusion_records ADD COLUMN IF NOT EXISTS second_teacher_name TEXT;
        GRANT ALL ON TABLE public.inclusion_records TO anon, authenticated, postgres, service_role;
    END IF;
END $$;
