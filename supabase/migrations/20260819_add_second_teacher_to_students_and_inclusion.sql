-- Migration: 20260819_add_second_teacher_to_students_and_inclusion.sql
-- Descrição: Permite vincular um Segundo Professor (AEE / Inclusão) diretamente ao Aluno PNE na tabela students e na tabela inclusion_records.

-- 1. Adicionar second_teacher_id e second_teacher_name na tabela students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS second_teacher_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS second_teacher_name TEXT;

-- 2. Adicionar second_teacher_id e second_teacher_name na tabela inclusion_records (caso exista a tabela)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'inclusion_records'
    ) THEN
        ALTER TABLE public.inclusion_records ADD COLUMN IF NOT EXISTS second_teacher_id TEXT;
        ALTER TABLE public.inclusion_records ADD COLUMN IF NOT EXISTS second_teacher_name TEXT;
    END IF;
END $$;

-- 3. Conceder permissões
GRANT ALL ON TABLE public.students TO anon, authenticated, postgres, service_role;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'inclusion_records'
    ) THEN
        GRANT ALL ON TABLE public.inclusion_records TO anon, authenticated, postgres, service_role;
    END IF;
END $$;
