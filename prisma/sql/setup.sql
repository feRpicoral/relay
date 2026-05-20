-- =============================================================================
-- Relay, RLS + auth integration
--
-- This script is idempotent. Run after `prisma migrate deploy`.
--
-- Layout:
--   1) Sync Supabase auth.users -> public.users (trigger + function).
--   2) Helper: is_member_of(org_id).
--   3) RLS on every tenant table with a single uniform policy.
--   4) RLS on the org + membership + invite tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Auth sync
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 2. Helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_member_of(target_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND org_id = target_org
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(target_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND org_id = target_org AND role = 'ADMIN'
  );
$$;

-- -----------------------------------------------------------------------------
-- 3. Tenant tables, uniform isolation policy
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'agents',
    'phone_numbers',
    'knowledge_docs',
    'calls',
    'transcripts',
    'tool_calls',
    'call_events',
    'call_metrics',
    'calcom_connections',
    'campaigns',
    'campaign_leads',
    'campaign_attempts',
    'audit_logs',
    'invites'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL USING (public.is_member_of(org_id)) WITH CHECK (public.is_member_of(org_id));',
      t
    );
  END LOOP;
END$$;

-- -----------------------------------------------------------------------------
-- 4. Users / Organizations / Memberships
-- -----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_self ON public.users;
CREATE POLICY users_self ON public.users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS users_org_peers ON public.users;
CREATE POLICY users_org_peers ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.memberships m1
      JOIN public.memberships m2 ON m1.org_id = m2.org_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = public.users.id
    )
  );

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_visibility ON public.organizations;
CREATE POLICY org_visibility ON public.organizations
  FOR SELECT USING (public.is_member_of(id));

DROP POLICY IF EXISTS org_admin_update ON public.organizations;
CREATE POLICY org_admin_update ON public.organizations
  FOR UPDATE USING (public.is_admin_of(id));

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_visibility ON public.memberships;
CREATE POLICY membership_visibility ON public.memberships
  FOR SELECT USING (user_id = auth.uid() OR public.is_member_of(org_id));

DROP POLICY IF EXISTS membership_admin_write ON public.memberships;
CREATE POLICY membership_admin_write ON public.memberships
  FOR ALL USING (public.is_admin_of(org_id));
