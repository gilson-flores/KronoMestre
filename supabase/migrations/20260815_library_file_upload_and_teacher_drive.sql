-- Migration: 20260815_library_file_upload_and_teacher_drive
-- Descrição: Garante suporte a upload de arquivos, links do Drive, turmas e colunas de apoio na tabela library_files e teachers.

-- 1. Garante que a tabela library_files possui todas as colunas necessárias
CREATE TABLE IF NOT EXISTS public.library_files (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Geral',
    turma TEXT NOT NULL DEFAULT 'Todas',
    file_size TEXT NOT NULL DEFAULT '1 MB',
    updated_at TEXT NOT NULL DEFAULT CURRENT_DATE::text,
    drive_url TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona colunas em library_files caso a tabela já existisse
ALTER TABLE public.library_files ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE public.library_files ADD COLUMN IF NOT EXISTS turma TEXT DEFAULT 'Todas';
ALTER TABLE public.library_files ADD COLUMN IF NOT EXISTS file_size TEXT DEFAULT '1 MB';
ALTER TABLE public.library_files ADD COLUMN IF NOT EXISTS updated_at TEXT DEFAULT CURRENT_DATE::text;
ALTER TABLE public.library_files ADD COLUMN IF NOT EXISTS drive_url TEXT;
ALTER TABLE public.library_files ADD COLUMN IF NOT EXISTS file_url TEXT;

-- 2. Garante que a tabela teachers tem a coluna drive_folder_url e avatar_url
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS drive_folder_url TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250';

-- 3. Configuração de RLS e Permissões
ALTER TABLE public.library_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total arquivos" ON public.library_files;
CREATE POLICY "Acesso total arquivos" ON public.library_files FOR ALL TO public USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.library_files TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.teachers TO anon, authenticated, postgres, service_role;
