-- Migration: Create plannings table for pedagogical planning and sequences

CREATE TABLE IF NOT EXISTS public.plannings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    turmas TEXT NOT NULL,
    serie TEXT,
    trimestre TEXT,
    period TEXT,
    start_date TEXT,
    end_date TEXT,
    subject TEXT DEFAULT 'Sociologia',
    type TEXT DEFAULT 'Sequência Didática',
    description TEXT,
    objectives TEXT,
    bncc_skills TEXT,
    fase1_content TEXT,
    fase2_content TEXT,
    fase3_content TEXT,
    current_phase INT DEFAULT 1,
    fase2_doc_url TEXT,
    fase2_document_id TEXT,
    fase3_doc_url TEXT,
    fase3_document_id TEXT,
    drive_repository_url TEXT,
    google_docs_url TEXT,
    history JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.plannings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total plannings" ON public.plannings;
CREATE POLICY "Acesso total plannings" ON public.plannings FOR ALL TO public USING (true) WITH CHECK (true);
