-- Migration: Create second_teachers table

CREATE TABLE IF NOT EXISTS public.second_teachers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    subject TEXT DEFAULT 'AEE / Inclusão Escolar',
    avatar_url TEXT,
    phone TEXT,
    school TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.second_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total second_teachers" ON public.second_teachers;
CREATE POLICY "Acesso total second_teachers" ON public.second_teachers FOR ALL TO public USING (true) WITH CHECK (true);
