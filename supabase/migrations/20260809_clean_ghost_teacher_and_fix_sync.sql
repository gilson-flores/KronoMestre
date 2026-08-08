-- Migration: 20260809_clean_ghost_teacher_and_fix_sync
-- Remover dados fantasmas da tabela teachers e liberar permissões gerais para o app

-- 1. Limpar registros fantasmas de professores legados (ex: Prof. Silva / professor@escola.edu.br)
DELETE FROM public.teachers WHERE email = 'professor@escola.edu.br' OR name = 'Prof. Silva';

-- 2. Garantir estrutura e colunas da tabela teachers
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'Sociologia',
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    school TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school TEXT;

-- 3. Configurar permissões e RLS para a tabela teachers
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total professores" ON public.teachers;
DROP POLICY IF EXISTS "Permitir leitura pública em professores" ON public.teachers;

CREATE POLICY "Acesso total professores" ON public.teachers
FOR ALL TO public
USING (true)
WITH CHECK (true);

-- 4. Conceder privilégios nas tabelas
GRANT ALL ON TABLE public.teachers TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.students TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.activities TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.submissions TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.schedule_items TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.library_files TO anon, authenticated, postgres, service_role;
