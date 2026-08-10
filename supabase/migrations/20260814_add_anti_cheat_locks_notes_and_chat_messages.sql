-- Migration: 20260814_add_anti_cheat_locks_notes_and_chat_messages
-- Descrição: Adiciona colunas de travas anti-cola na tabela activities, anotações pedagógicas na tabela students, e cria a tabela chat_messages para persistência total em nuvem.

-- 1. Colunas de travas anti-cola na tabela activities
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS security_focus_lock BOOLEAN DEFAULT false;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS security_block_copy_statement BOOLEAN DEFAULT false;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS security_block_paste_essay BOOLEAN DEFAULT false;

-- 2. Coluna de anotações pedagógicas na tabela de alunos
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS pedagogical_notes TEXT DEFAULT '';

-- 3. Tabela de mensagens do canal de comunicação (chat_messages)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  sender_role TEXT,
  sender_avatar TEXT,
  recipient_id TEXT NOT NULL,
  recipient_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false,
  activity_id TEXT,
  activity_title TEXT
);

-- 4. Habilitar RLS e permissões completas
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso livre a chat_messages" ON public.chat_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.activities TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.students TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.chat_messages TO anon, authenticated, postgres, service_role;
