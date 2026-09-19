-- G45-Nacharbeit (Review 2): Mitgliedschafts-Selbstleserecht nur für aktive
-- Mitgliedschaft in aktiver Organisation. Suspendierte Mitglieder und
-- Mitglieder suspendierter Organisationen erhalten keine lesbare
-- Mitgliedschaftszeile — der OrganizationProvider bildet daraus keine
-- UI-Sitzung und ProtectedRoute leitet nach /login um.
-- Idempotent und re-runnable formuliert.

DROP POLICY IF EXISTS "member_select_own_membership" ON public.organization_members;
CREATE POLICY "member_select_own_membership" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.organizations AS org
      WHERE org.id = organization_id
        AND org.status = 'active'
    )
  );
