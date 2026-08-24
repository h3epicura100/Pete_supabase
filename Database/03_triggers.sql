-- FUNCTION TO AUTO-COMPUTE MONTH NAME AND AUTO-LINK FOREIGN KEYS FROM PETE_MASTER ON PETE_TRANSACTIONS
CREATE OR REPLACE FUNCTION public.enrich_transaction_data()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Auto-compute month_name from entry_date
    IF NEW.entry_date IS NOT NULL THEN
        NEW.month_name := trim(to_char(NEW.entry_date, 'FMMonth'));
    END IF;

    -- 2. Auto-link person_id from pete_master table (category = 'person')
    IF NEW.person_name IS NOT NULL AND NEW.person_id IS NULL THEN
        SELECT id INTO NEW.person_id 
        FROM public.pete_master 
        WHERE category = 'person' AND lower(value) = lower(trim(NEW.person_name)) 
        LIMIT 1;
    END IF;

    -- 3. Auto-link mode_id from pete_master table (category = 'mode')
    IF NEW.mode IS NOT NULL AND NEW.mode_id IS NULL THEN
        SELECT id INTO NEW.mode_id 
        FROM public.pete_master 
        WHERE category = 'mode' AND lower(value) = lower(trim(NEW.mode)) 
        LIMIT 1;
    END IF;

    -- 4. Auto-link group_head_id from pete_master table (category = 'group_head')
    IF NEW.group_head IS NOT NULL AND NEW.group_head_id IS NULL THEN
        SELECT id INTO NEW.group_head_id 
        FROM public.pete_master 
        WHERE category = 'group_head' AND lower(value) = lower(trim(NEW.group_head)) 
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER ON PETE_TRANSACTIONS TABLE
DROP TRIGGER IF EXISTS trigger_enrich_transaction ON public.pete_transactions;

CREATE TRIGGER trigger_enrich_transaction
BEFORE INSERT OR UPDATE ON public.pete_transactions
FOR EACH ROW
EXECUTE FUNCTION public.enrich_transaction_data();


-- FUNCTION TO AUTO-LINK FOREIGN KEYS FROM PETE_MASTER ON PETE_RECEIVING_ENTRIES
CREATE OR REPLACE FUNCTION public.enrich_receiving_data()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Auto-link vendor_id from pete_master table (category = 'vendor')
    IF NEW.vendor_name IS NOT NULL AND NEW.vendor_id IS NULL THEN
        SELECT id INTO NEW.vendor_id 
        FROM public.pete_master 
        WHERE category = 'vendor' AND lower(value) = lower(trim(NEW.vendor_name)) 
        LIMIT 1;
    END IF;

    -- 2. Auto-link mode_id from pete_master table (category = 'mode')
    IF NEW.mode IS NOT NULL AND NEW.mode_id IS NULL THEN
        SELECT id INTO NEW.mode_id 
        FROM public.pete_master 
        WHERE category = 'mode' AND lower(value) = lower(trim(NEW.mode)) 
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER ON PETE_RECEIVING_ENTRIES TABLE
DROP TRIGGER IF EXISTS trigger_enrich_receiving ON public.pete_receiving_entries;

CREATE TRIGGER trigger_enrich_receiving
BEFORE INSERT OR UPDATE ON public.pete_receiving_entries
FOR EACH ROW
EXECUTE FUNCTION public.enrich_receiving_data();
