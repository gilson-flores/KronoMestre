-- Migration: 20260914_secure_rls_atestados_rad.sql
-- Descrição: Fecha o RLS da tabela atestados_rad para acesso público/anon/authenticated.
-- O acesso agora é 100% mediado pelo backend Next.js (service_role) com isolamento por owner_teacher_id.

-- 1. Garante a coluna owner_teacher_id e índice para alta performance
ALTER TABLE public.atestados_rad 
ADD COLUMN IF NOT EXISTS owner_teacher_id TEXT;

CREATE INDEX IF NOT EXISTS idx_atestados_rad_owner_teacher_id 
ON public.atestados_rad(owner_teacher_id);

-- 2. Habilita RLS
ALTER TABLE public.atestados_rad ENABLE ROW LEVEL SECURITY;

-- 3. Remove políticas permissivas antigas
DROP POLICY IF EXISTS "Acesso total atestados_rad" ON public.atestados_rad;
DROP POLICY IF EXISTS "Deny all direct anon access" ON public.atestados_rad;

-- 4. Cria política explícita de negação para clientes diretos (anon / authenticated)
-- Como o backend usa a service_role key, ele ignora o RLS e tem acesso total controlado via código.
REVOKE ALL ON TABLE public.atestados_rad FROM anon, authenticated;
GRANT ALL ON TABLE public.atestados_rad TO service_role, postgres;
