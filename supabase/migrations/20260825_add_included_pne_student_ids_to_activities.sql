-- Migration: 20260825_add_included_pne_student_ids_to_activities.sql
-- Descrição: Adiciona coluna included_pne_student_ids na tabela activities para permitir
-- que o professor libere atividades normais/regulares para alunos PNE específicos com persistência definitiva.

-- 1. Adicionar coluna included_pne_student_ids na tabela activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS included_pne_student_ids JSONB DEFAULT '[]'::jsonb;

-- 2. Garantir permissões completas para leitura e gravação
GRANT ALL ON TABLE public.activities TO anon, authenticated, postgres, service_role;
