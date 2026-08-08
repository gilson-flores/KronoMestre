-- Migration: 20260810_add_cascade_delete_activities
-- Garantir permissões de exclusão e CASCADE para exclusão de atividades e submissões

-- 1. Se a chave estrangeira existir sem ON DELETE CASCADE, reconfiguramos para deleção automática de submissões
ALTER TABLE IF EXISTS public.submissions
  DROP CONSTRAINT IF EXISTS submissions_activity_id_fkey;

ALTER TABLE IF EXISTS public.submissions
  ADD CONSTRAINT submissions_activity_id_fkey
  FOREIGN KEY (activity_id)
  REFERENCES public.activities(id)
  ON DELETE CASCADE;

-- 2. Garantir políticas de deleção para RLS
DROP POLICY IF EXISTS "Permitir deleção de atividades" ON public.activities;
CREATE POLICY "Permitir deleção de atividades" ON public.activities
FOR DELETE TO public
USING (true);

DROP POLICY IF EXISTS "Permitir deleção de submissões" ON public.submissions;
CREATE POLICY "Permitir deleção de submissões" ON public.submissions
FOR DELETE TO public
USING (true);

-- 3. Garantir privilégios
GRANT ALL ON TABLE public.activities TO anon, authenticated, postgres, service_role;
GRANT ALL ON TABLE public.submissions TO anon, authenticated, postgres, service_role;
