-- Migration: 20260820_add_adapted_activities_pne_schema.sql
-- Descrição: Adiciona colunas para suporte a atividades adaptadas para alunos com Necessidades Educacionais Específicas (PNE / AEE),
-- incluindo modalidade de adaptação gerada por IA Gemini (Leve/Moderada ou Lúdica/Severa) e armazenamento de código de jogo lúdico em HTML.

-- 1. Adicionar colunas de suporte a adaptação PNE na tabela activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_adapted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS adaptation_type TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS playful_game_html TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS playful_game_score_max NUMERIC DEFAULT 10;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS adapted_from_id TEXT;

-- 2. Garantir índices para buscas rápidas de atividades adaptadas
CREATE INDEX IF NOT EXISTS idx_activities_is_adapted ON public.activities(is_adapted);
CREATE INDEX IF NOT EXISTS idx_activities_adapted_from_id ON public.activities(adapted_from_id);

-- 3. Conceder permissões para os papéis de acesso
GRANT ALL ON TABLE public.activities TO anon, authenticated, postgres, service_role;
