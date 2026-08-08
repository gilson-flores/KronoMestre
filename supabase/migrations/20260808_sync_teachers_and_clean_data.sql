-- Migration: Atualização da tabela de professores e permissões
-- Data: 2026-08-08

-- 1. Garantir que as colunas phone e school existam na tabela de professores
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school TEXT;

-- 2. Garantir políticas RLS para leitura, inserção e atualização na tabela de professores
DROP POLICY IF EXISTS "Acesso total professores" ON public.teachers;
CREATE POLICY "Acesso total professores" ON public.teachers FOR ALL TO public USING (true) WITH CHECK (true);
