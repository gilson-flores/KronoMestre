-- Migration: 20260816_fix_teachers_schema_and_email_unique
-- Descrição: Garante restrição UNIQUE no e-mail, colunas necessárias e permissões RLS na tabela teachers.

-- 1. Criar tabela teachers caso não exista
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'Sociologia',
    email TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    school TEXT,
    drive_folder_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar colunas necessárias se ausentes
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS drive_folder_url TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250';

-- 3. Garantir constraint UNIQUE no e-mail
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'teachers_email_key' AND conrelid = 'public.teachers'::regclass
    ) THEN
        ALTER TABLE public.teachers ADD CONSTRAINT teachers_email_key UNIQUE (email);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Habilitar RLS e aplicar política de acesso irrestrito
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total professores" ON public.teachers;
CREATE POLICY "Acesso total professores" ON public.teachers FOR ALL TO public USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.teachers TO anon, authenticated, postgres, service_role;
