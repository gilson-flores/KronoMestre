-- Migration: 20260817_add_second_teacher_inclusion_pei
-- Descrição: Cria a tabela inclusion_records para gerenciar PEI (Plano de Ensino Individualizado), recursos adaptados e histórico de pareceres do 2º Professor de Inclusão.

CREATE TABLE IF NOT EXISTS public.inclusion_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    turma TEXT,
    diagnosis_notes TEXT DEFAULT '',
    pei_goals TEXT DEFAULT '',
    adapted_resources TEXT DEFAULT '',
    evaluations_history JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir constraint UNIQUE por student_id para que cada aluno tenha 1 registro principal de PEI
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inclusion_records_student_id_key' AND conrelid = 'public.inclusion_records'::regclass
    ) THEN
        ALTER TABLE public.inclusion_records ADD CONSTRAINT inclusion_records_student_id_key UNIQUE (student_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Habilitar RLS e permissões completas
ALTER TABLE public.inclusion_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total aos registros de inclusao" ON public.inclusion_records;
CREATE POLICY "Acesso total aos registros de inclusao" ON public.inclusion_records FOR ALL TO public USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.inclusion_records TO anon, authenticated, postgres, service_role;
