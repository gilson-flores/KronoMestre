-- Migration: 20260914_add_owner_teacher_id_to_students.sql
-- Descrição: Sub-passo 1 de 5 da migração de students.
-- 1. Garante a coluna owner_teacher_id (TEXT) na tabela students.
-- 2. Backfill: Garante que todos os registros existentes (ativos ou arquivados) fiquem associados ao professor titular '46752b51-de1e-4403-aff3-57584cdf9428'.
-- 3. Cria índice em owner_teacher_id para alta performance em consultas multi-tenant.

-- 1. Adicionar coluna se não existir
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;

-- 2. Backfill: associar todos os registros existentes ao titular
UPDATE public.students
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428'
WHERE owner_teacher_id IS NULL OR owner_teacher_id = '';

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_students_owner_teacher_id 
ON public.students(owner_teacher_id);
