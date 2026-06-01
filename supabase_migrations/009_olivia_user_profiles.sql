-- Olivia-owned profile table.
--
-- The shared RealtyFlow Supabase project already has a public.user_profiles
-- table for another app. Olivia auth must not use that table because the
-- column contract differs. Keep Olivia app profiles in the olivia schema.

CREATE TABLE IF NOT EXISTS olivia.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  role text not null default 'farmer',
  subscription text not null default 'trial',
  subscription_start text not null default to_char(current_date, 'YYYY-MM-DD'),
  avatar text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint olivia_user_profiles_role_check check (role in ('farmer', 'super_admin')),
  constraint olivia_user_profiles_subscription_check check (subscription in ('monthly', 'annual', 'lifetime', 'trial'))
);

INSERT INTO olivia.user_profiles (
  id,
  email,
  name,
  role,
  subscription,
  subscription_start,
  avatar,
  created_at,
  updated_at
)
SELECT
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'name', split_part(coalesce(u.email, ''), '@', 1), ''),
  CASE
    WHEN coalesce(u.raw_app_meta_data->>'role', u.raw_user_meta_data->>'role') IN ('admin', 'super_admin')
      THEN 'super_admin'
    ELSE 'farmer'
  END,
  'trial',
  to_char(coalesce(u.created_at, now()), 'YYYY-MM-DD'),
  NULL,
  coalesce(u.created_at, now()),
  now()
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET
  email = excluded.email,
  name = coalesce(nullif(olivia.user_profiles.name, ''), excluded.name),
  role = CASE
    WHEN olivia.user_profiles.role = 'super_admin' OR excluded.role = 'super_admin'
      THEN 'super_admin'
    ELSE olivia.user_profiles.role
  END,
  updated_at = now();

ALTER TABLE olivia.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS olivia_profiles_select_own ON olivia.user_profiles;
CREATE POLICY olivia_profiles_select_own
ON olivia.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS olivia_profiles_insert_own ON olivia.user_profiles;
CREATE POLICY olivia_profiles_insert_own
ON olivia.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS olivia_profiles_update_own ON olivia.user_profiles;
CREATE POLICY olivia_profiles_update_own
ON olivia.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS user_profiles_set_updated_at ON olivia.user_profiles;
CREATE TRIGGER user_profiles_set_updated_at
BEFORE UPDATE ON olivia.user_profiles
FOR EACH ROW
EXECUTE FUNCTION olivia.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON olivia.user_profiles TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
