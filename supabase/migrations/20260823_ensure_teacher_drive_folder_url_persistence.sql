-- Migration: 20260821_ensure_teacher_drive_folder_url_persistence.sql
-- Descrição: Garante a persistência e gravação da coluna drive_folder_url na tabela teachers para o repositório do Google Drive.

-- 1. Garante que a coluna drive_folder_url existe na tabela teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS drive_folder_url TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school TEXT DEFAULT '';

-- 2. Habilita RLS e garante política de acesso público total para leitura/escrita
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total professores drive" ON public.teachers;
CREATE POLICY "Acesso total professores drive" ON public.teachers FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. Concede permissões para todos os papéis do Supabase
GRANT ALL ON TABLE public.teachers TO anon, authenticated, postgres, service_role;
