-- DISABLE RLS FOR ALL PUBLIC PETE TABLES
-- (As requested: Row Level Security is disabled for simplified API client access without JWT auth requirements)

ALTER TABLE public.pete_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pete_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pete_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pete_receiving_entries DISABLE ROW LEVEL SECURITY;
