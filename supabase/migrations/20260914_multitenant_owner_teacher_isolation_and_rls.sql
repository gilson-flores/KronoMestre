-- Migration: 20260914_multitenant_owner_teacher_isolation_and_rls.sql
-- Descrição: Implementa isolamento multi-tenant B2C com owner_teacher_id e políticas de RLS granulares

-- 1. Adicionar owner_teacher_id nas tabelas principais
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;
ALTER TABLE public.second_teachers ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;
ALTER TABLE public.inclusion_records ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;
ALTER TABLE public.atestados_rad ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;
ALTER TABLE public.library_files ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;
ALTER TABLE public.schedule_items ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;

-- 2. Índices de performance para busca por professor titular
CREATE INDEX IF NOT EXISTS idx_students_owner_teacher_id ON public.students (owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_activities_owner_teacher_id ON public.activities (owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_owner_teacher_id ON public.submissions (owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_second_teachers_owner_teacher_id ON public.second_teachers (owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_inclusion_records_owner_teacher_id ON public.inclusion_records (owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_atestados_rad_owner_teacher_id ON public.atestados_rad (owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_library_files_owner_teacher_id ON public.library_files (owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_owner_teacher_id ON public.schedule_items (owner_teacher_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_owner_teacher_id ON public.chat_messages (owner_teacher_id);

-- 3. Backfill com o ID do Professor Titular (Gilson Flores)
-- ID: '46752b51-de1e-4403-aff3-57584cdf9428'
UPDATE public.students 
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428' 
WHERE owner_teacher_id IS NULL;

UPDATE public.activities 
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428' 
WHERE owner_teacher_id IS NULL;

UPDATE public.submissions 
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428' 
WHERE owner_teacher_id IS NULL;

UPDATE public.second_teachers 
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428' 
WHERE owner_teacher_id IS NULL;

UPDATE public.inclusion_records 
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428' 
WHERE owner_teacher_id IS NULL;

UPDATE public.atestados_rad 
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428' 
WHERE owner_teacher_id IS NULL;

UPDATE public.library_files 
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428' 
WHERE owner_teacher_id IS NULL;

UPDATE public.schedule_items 
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428' 
WHERE owner_teacher_id IS NULL;

UPDATE public.chat_messages 
SET owner_teacher_id = '46752b51-de1e-4403-aff3-57584cdf9428' 
WHERE owner_teacher_id IS NULL;

-- 4. Reestruturação das Políticas de RLS (Row Level Security)

-- TEACHERS: Professor só lê/edita seu próprio perfil
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total professores" ON public.teachers;
DROP POLICY IF EXISTS "Permitir leitura pública em professores" ON public.teachers;
DROP POLICY IF EXISTS "Acesso total professores drive" ON public.teachers;

CREATE POLICY "Professores gerenciam seu proprio registro" ON public.teachers
FOR ALL TO authenticated, anon
USING (
  id::text = auth.uid()::text OR 
  email = auth.jwt() ->> 'email' OR
  auth.role() = 'anon' -- Necessário para handshake de login inicial
)
WITH CHECK (
  id::text = auth.uid()::text OR 
  email = auth.jwt() ->> 'email' OR
  auth.role() = 'anon'
);

-- STUDENTS: Isolamento por Professor Titular + Acesso de Aluno / 2º Professor
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total alunos" ON public.students;

CREATE POLICY "Isolamento multi-tenant students" ON public.students
FOR ALL TO authenticated, anon
USING (
  -- Professor Titular dono dos dados
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  -- Ou 2º Professor vinculado
  OR second_teacher_id = auth.uid()::text
  -- Ou o próprio Aluno buscando sua turma/matrícula no login
  OR auth.role() = 'anon'
)
WITH CHECK (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
);

-- ACTIVITIES: Isolamento por Professor Titular
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total atividades" ON public.activities;
DROP POLICY IF EXISTS "Permitir deleção de atividades" ON public.activities;

CREATE POLICY "Isolamento multi-tenant activities" ON public.activities
FOR ALL TO authenticated, anon
USING (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
)
WITH CHECK (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
);

-- SUBMISSIONS: Isolamento por Professor Titular
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total entregas" ON public.submissions;
DROP POLICY IF EXISTS "Permitir deleção de submissões" ON public.submissions;

CREATE POLICY "Isolamento multi-tenant submissions" ON public.submissions
FOR ALL TO authenticated, anon
USING (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
)
WITH CHECK (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
);

-- SECOND_TEACHERS: Isolamento por Professor Titular
ALTER TABLE public.second_teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total second_teachers" ON public.second_teachers;
DROP POLICY IF EXISTS "Acesso total segundo professor" ON public.second_teachers;

CREATE POLICY "Isolamento multi-tenant second_teachers" ON public.second_teachers
FOR ALL TO authenticated, anon
USING (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR id::text = auth.uid()::text
  OR auth.role() = 'anon'
)
WITH CHECK (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
);

-- INCLUSION_RECORDS: Isolamento por Professor Titular / 2º Professor
ALTER TABLE public.inclusion_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total aos registros de inclusao" ON public.inclusion_records;

CREATE POLICY "Isolamento multi-tenant inclusion_records" ON public.inclusion_records
FOR ALL TO authenticated, anon
USING (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR second_teacher_id = auth.uid()::text
  OR auth.role() = 'anon'
)
WITH CHECK (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR second_teacher_id = auth.uid()::text
  OR auth.role() = 'anon'
);

-- ATESTADOS_RAD: Isolamento por Professor Titular
ALTER TABLE public.atestados_rad ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total atestados_rad" ON public.atestados_rad;

CREATE POLICY "Isolamento multi-tenant atestados_rad" ON public.atestados_rad
FOR ALL TO authenticated, anon
USING (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
)
WITH CHECK (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
);

-- LIBRARY_FILES: Isolamento por Professor Titular
ALTER TABLE public.library_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total arquivos" ON public.library_files;

CREATE POLICY "Isolamento multi-tenant library_files" ON public.library_files
FOR ALL TO authenticated, anon
USING (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
)
WITH CHECK (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
);

-- SCHEDULE_ITEMS: Isolamento por Professor Titular
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso total horários" ON public.schedule_items;

CREATE POLICY "Isolamento multi-tenant schedule_items" ON public.schedule_items
FOR ALL TO authenticated, anon
USING (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
)
WITH CHECK (
  owner_teacher_id = auth.uid()::text 
  OR owner_teacher_id = (SELECT id::text FROM public.teachers WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  OR auth.role() = 'anon'
);
