import { supabase } from '@/lib/supabase';

export interface DropdownOptions {
  personNames: string[];
  reasons: string[];
  groupHeads: string[];
  modes: string[];
  vendorNames?: string[];
  months?: string[];
}

export interface MasterItem {
  id: string;
  category: string;
  value: string;
  created_at: string;
}

/**
 * Fetches all raw rows from public.pete_master table.
 */
export async function fetchAllMasterItemsFromSupabase(): Promise<MasterItem[]> {
  const { data, error } = await supabase
    .from('pete_master')
    .select('id, category, value, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all master items:', error);
    throw new Error(`Failed to fetch master items: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetches all master dropdown options grouped by category from public.pete_master.
 */
export async function fetchDropdownOptionsFromSupabase(): Promise<{
  personName: string[];
  mode: string[];
  groupHead: string[];
  reason: string[];
  vendorNames: string[];
}> {
  const { data, error } = await supabase
    .from('pete_master')
    .select('category, value')
    .order('value', { ascending: true });

  if (error) {
    console.error('Error fetching master dropdown options:', error);
    throw new Error(`Failed to fetch dropdown options: ${error.message}`);
  }

  const items = data || [];

  return {
    personName: items.filter((i) => i.category === 'person').map((i) => i.value),
    mode: items.filter((i) => i.category === 'mode').map((i) => i.value),
    groupHead: items.filter((i) => i.category === 'group_head').map((i) => i.value),
    reason: items.filter((i) => i.category === 'reason').map((i) => i.value),
    vendorNames: items.filter((i) => i.category === 'vendor').map((i) => i.value),
  };
}

/**
 * Generic helper to add an option to public.pete_master table.
 * If the item already exists (case-insensitive), returns true without throwing duplicate key error.
 */
export async function addDropdownOptionToSupabase(category: string, value: string): Promise<boolean> {
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Check if option already exists (case-insensitive)
  const { data: existing } = await supabase
    .from('pete_master')
    .select('id, value')
    .eq('category', category)
    .ilike('value', trimmed)
    .maybeSingle();

  if (existing) {
    return true;
  }

  const { error } = await supabase
    .from('pete_master')
    .insert({ category, value: trimmed });

  if (error) {
    // Gracefully handle duplicate key unique constraint violation
    if (error.code === '23505' || error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
      return true;
    }
    console.error(`Error adding dropdown option for ${category}:`, error);
    throw new Error(error.message);
  }
  return true;
}


/**
 * Deletes a row by ID from public.pete_master table.
 */
export async function deleteDropdownOptionFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('pete_master')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting master option ${id}:`, error);
    throw new Error(error.message);
  }
  return true;
}

export async function addPersonToSupabase(name: string): Promise<boolean> {
  return addDropdownOptionToSupabase('person', name);
}

export async function addGroupHeadToSupabase(name: string): Promise<boolean> {
  return addDropdownOptionToSupabase('group_head', name);
}

export async function addReasonToSupabase(name: string): Promise<boolean> {
  return addDropdownOptionToSupabase('reason', name);
}

export async function addVendorToSupabase(name: string): Promise<boolean> {
  return addDropdownOptionToSupabase('vendor', name);
}
