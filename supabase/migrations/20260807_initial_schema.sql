-- Migration SQL para o Supabase
-- Sistema: Sociologia On-line

-- 1. Tabela de Professores
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

-- Ensure columns exist if table was already created
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school TEXT;

-- 2. Tabela de Alunos
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

-- 3. Tabela de Atividades
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    turma TEXT NOT NULL,
    type TEXT CHECK (type IN ('Simulado', 'Redação', 'Dinâmica', 'Avaliação')) NOT NULL,
    status TEXT CHECK (status IN ('Ativo', 'Prazo Encerrado', 'Inativo')) NOT NULL DEFAULT 'Ativo',
    deadline TEXT,
    total_submissions INT DEFAULT 0,
    total_students INT DEFAULT 35,
    pending_correction INT DEFAULT 0,
    average_grade NUMERIC(4,2),
    completed_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Entregas / Correções dos Alunos
CREATE TABLE IF NOT EXISTS public.submissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    activity_id TEXT NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    matricula TEXT NOT NULL,
    tag TEXT,
    avatar_url TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    objective_score NUMERIC(4,2) DEFAULT 0.0,
    max_objective_score NUMERIC(4,2) DEFAULT 5.0,
    essay_score NUMERIC(4,2),
    max_essay_score NUMERIC(4,2) DEFAULT 5.0,
    status TEXT CHECK (status IN ('pending', 'draft', 'graded', 'returned')) DEFAULT 'pending',
    essay_answer TEXT,
    teacher_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Horários
CREATE TABLE IF NOT EXISTS public.schedule_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    turma TEXT NOT NULL,
    room TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'Sociologia'
);

-- 6. Tabela da Biblioteca / Arquivos
CREATE TABLE IF NOT EXISTS public.library_files (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    turma TEXT NOT NULL,
    file_size TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_DATE::text
);

-- Habilitar Políticas de Segurança (Row Level Security)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_files ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar sobreposição
DROP POLICY IF EXISTS "Permitir leitura pública em professores" ON public.teachers;
DROP POLICY IF EXISTS "Permitir leitura pública em alunos" ON public.students;
DROP POLICY IF EXISTS "Permitir alteração de alunos" ON public.students;
DROP POLICY IF EXISTS "Permitir acesso total em atividades" ON public.activities;
DROP POLICY IF EXISTS "Permitir acesso total em entregas" ON public.submissions;
DROP POLICY IF EXISTS "Permitir acesso total em horários" ON public.schedule_items;
DROP POLICY IF EXISTS "Permitir acesso total em arquivos" ON public.library_files;
DROP POLICY IF EXISTS "Acesso total professores" ON public.teachers;
DROP POLICY IF EXISTS "Acesso total alunos" ON public.students;
DROP POLICY IF EXISTS "Acesso total atividades" ON public.activities;
DROP POLICY IF EXISTS "Acesso total entregas" ON public.submissions;
DROP POLICY IF EXISTS "Acesso total horários" ON public.schedule_items;
DROP POLICY IF EXISTS "Acesso total arquivos" ON public.library_files;

-- Criar políticas de acesso total com USING e WITH CHECK para permitir SELECT, INSERT, UPDATE e DELETE
CREATE POLICY "Acesso total professores" ON public.teachers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total alunos" ON public.students FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total atividades" ON public.activities FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total entregas" ON public.submissions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total horários" ON public.schedule_items FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total arquivos" ON public.library_files FOR ALL TO public USING (true) WITH CHECK (true);

-- Inserção de Dados Iniciais de Demonstração
INSERT INTO public.teachers (name, subject, email, avatar_url)
VALUES ('Prof. Silva', 'Sociologia', 'professor@escola.edu.br', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.students (full_name, turma, matricula, tag, password_hash, avatar_url)
VALUES 
    ('Lucas Gabriel Martins', '3º Ano B', '2023001', 'REGULAR', '1234', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200'),
    ('João Pedro Silva', '3º Ano B', '2023042', 'PNE', '1234', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'),
    ('João Pedro Almeida', 'Turma 302', '2023001', 'PNE', '1234', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'),
    ('Mariana Silva', '2º Ano A', '2023045', 'RAD', '1234', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'),
    ('Beatriz Souza', '1º Ano C', '2023089', 'REGULAR', '1234', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200')
ON CONFLICT (matricula) DO NOTHING;
