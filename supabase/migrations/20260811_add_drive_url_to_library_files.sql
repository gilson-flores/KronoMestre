-- Migration: Adiciona suporte a link do Google Drive para arquivos da biblioteca
ALTER TABLE public.library_files ADD COLUMN IF NOT EXISTS drive_url TEXT;
