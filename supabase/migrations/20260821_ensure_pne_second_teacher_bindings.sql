-- Migration: 20260821_ensure_pne_second_teacher_bindings.sql
-- Descrição: Garante a criação e persistência das colunas de vinculação do 2º Professor e condições PNE na tabela de estudantes.

-- 1. Garante que as colunas necessárias existem na tabela public.students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS second_teacher_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS second_teacher_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS pne_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS pedagogical_notes TEXT DEFAULT '';

-- 2. Habilita RLS e garante política de acesso irrestrito para leitura e atualização
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total alunos" ON public.students;
CREATE POLICY "Acesso total alunos" ON public.students FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. Garante permissões em public.students para todas as roles
GRANT ALL ON TABLE public.students TO anon, authenticated, postgres, service_role;

-- 4. Se a tabela public.inclusion_records existir, garante que ela possui as colunas do 2º professor
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
