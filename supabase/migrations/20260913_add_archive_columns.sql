-- Adiciona colunas de arquivamento na tabela students
ALTER TABLE public.students
ADD COLUMN is_archived BOOLEAN DEFAULT false,
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN archived_reason TEXT DEFAULT NULL;

-- Adiciona colunas de arquivamento na tabela activities
ALTER TABLE public.activities
ADD COLUMN is_archived BOOLEAN DEFAULT false,
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN archived_reason TEXT DEFAULT NULL;
