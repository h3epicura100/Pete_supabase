-- Enable pgcrypto extension for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE (System Logins)
CREATE TABLE IF NOT EXISTS public.pete_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    pages TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. UNIFIED DROPDOWN MASTER TABLE (public.pete_master)
CREATE TABLE IF NOT EXISTS public.pete_master (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pete_master_pkey PRIMARY KEY (id),
    CONSTRAINT pete_master_category_value_key UNIQUE (category, value)
);

-- 3. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.pete_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date TIMESTAMPTZ NOT NULL,
    person_name TEXT NOT NULL,
    person_id UUID REFERENCES public.pete_master(id) ON DELETE SET NULL,
    incoming NUMERIC(12, 2) DEFAULT 0,
    outgoing NUMERIC(12, 2) DEFAULT 0,
    mode TEXT,
    mode_id UUID REFERENCES public.pete_master(id) ON DELETE SET NULL,
    group_head TEXT,
    group_head_id UUID REFERENCES public.pete_master(id) ON DELETE SET NULL,
    reason TEXT,
    photo_url TEXT,
    month_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RECEIVING ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.pete_receiving_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date TIMESTAMPTZ NOT NULL,
    vendor_name TEXT NOT NULL,
    vendor_id UUID REFERENCES public.pete_master(id) ON DELETE SET NULL,
    invoice_amount NUMERIC(12, 2) DEFAULT 0,
    invoice_number TEXT,
    mode TEXT,
    mode_id UUID REFERENCES public.pete_master(id) ON DELETE SET NULL,
    remarks TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DROP OLD UNUSED TABLES IF THEY EXIST
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.master CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.receiving_entries CASCADE;
DROP TABLE IF EXISTS public.lto_dropdown CASCADE;
DROP TABLE IF EXISTS public.persons CASCADE;
DROP TABLE IF EXISTS public.modes CASCADE;
DROP TABLE IF EXISTS public.group_heads CASCADE;
DROP TABLE IF EXISTS public.reasons CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_pete_master_category ON public.pete_master(category);
CREATE INDEX IF NOT EXISTS idx_pete_transactions_entry_date ON public.pete_transactions(entry_date);
CREATE INDEX IF NOT EXISTS idx_pete_transactions_person_name ON public.pete_transactions(person_name);
CREATE INDEX IF NOT EXISTS idx_pete_transactions_group_head ON public.pete_transactions(group_head);

CREATE INDEX IF NOT EXISTS idx_pete_receiving_entry_date ON public.pete_receiving_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_pete_receiving_vendor_name ON public.pete_receiving_entries(vendor_name);
