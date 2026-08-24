import { supabase } from '@/lib/supabase';

export interface AppUser {
  id: string;
  name: string;
  password?: string;
  role: "user" | "admin";
  pages: string[];
}

export interface DbUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: string;
  pages: string[];
  created_at?: string;
}

const allPossiblePages = ['dashboard', 'form', 'receiving', 'reports', 'master', 'settings'];

const pageNameMapping: { [key: string]: string } = {
  'dashboard': 'dashboard',
  'add entry': 'form',
  'form': 'form',
  'receive entry': 'receiving',
  'receiving': 'receiving',
  'reports': 'reports',
  'master': 'master',
  'master data': 'master',
  'settings': 'settings',
};

/**
 * Fetches all registered users from Supabase pete_users table for login / session logic.
 * Admins automatically receive access to 'settings' and 'master' by default.
 */
export async function fetchUsersFromSupabase(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('pete_users')
    .select('id, name, username, password, role, pages');

  if (error) {
    console.error('Error fetching users from Supabase:', error);
    throw new Error(`Failed to fetch user data: ${error.message}`);
  }

  if (!data) return [];

  return data.map((row: any) => {
    let pages: string[] = [];
    if (Array.isArray(row.pages)) {
      if (row.pages.length === 1 && String(row.pages[0]).toLowerCase() === 'all') {
        pages = [...allPossiblePages];
      } else {
        pages = row.pages
          .map((p: string) => pageNameMapping[p.trim().toLowerCase()] || p.trim().toLowerCase())
          .filter(Boolean)
          .filter((v: string, i: number, s: string[]) => s.indexOf(v) === i);
      }
    }

    // Admins have default access to settings and master pages
    if (row.role === 'admin') {
      if (!pages.includes('settings')) pages.push('settings');
      if (!pages.includes('master')) pages.push('master');
    }

    return {
      id: row.username || row.name || row.id,
      name: row.name || row.username,
      password: row.password || '',
      role: row.role === 'admin' ? 'admin' : 'user',
      pages: pages,
    };
  });
}

/**
 * Fetches all user rows with raw fields for the Settings management page.
 */
export async function fetchAllDbUsersFromSupabase(): Promise<DbUser[]> {
  const { data, error } = await supabase
    .from('pete_users')
    .select('id, name, username, password, role, pages, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching db users:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return (data || []).map((row: any) => {
    let rawPages: string[] = [];
    if (Array.isArray(row.pages)) {
      if (row.pages.length === 1 && String(row.pages[0]).toLowerCase() === 'all') {
        rawPages = [...allPossiblePages];
      } else {
        rawPages = row.pages
          .map((p: string) => pageNameMapping[p.trim().toLowerCase()] || p.trim().toLowerCase())
          .filter(Boolean)
          .filter((v: string, i: number, s: string[]) => s.indexOf(v) === i);
      }
    }

    if (row.role === 'admin') {
      if (!rawPages.includes('settings')) rawPages.push('settings');
      if (!rawPages.includes('master')) rawPages.push('master');
    }

    return {
      id: row.id,
      name: row.name || '',
      username: row.username || '',
      password: row.password || '',
      role: row.role || 'counter',
      pages: rawPages,
      created_at: row.created_at || '',
    };
  });
}

/**
 * Inserts a new user record into public.pete_users table and public.pete_master (if category 'person').
 */
export async function addUserToSupabase(payload: {
  name: string;
  username: string;
  password?: string;
  role: string;
  pages: string[];
}): Promise<boolean> {
  let userPages = [...payload.pages];
  if (payload.role === 'admin') {
    if (!userPages.includes('settings')) userPages.push('settings');
    if (!userPages.includes('master')) userPages.push('master');
  }

  const { error } = await supabase.from('pete_users').insert({
    name: payload.name.trim(),
    username: payload.username.trim(),
    password: payload.password?.trim() || '',
    role: payload.role.trim(),
    pages: userPages,
  });

  if (error) {
    console.error('Error adding user:', error);
    throw new Error(`Failed to create user: ${error.message}`);
  }

  // Also auto-add person to pete_master table if not present
  try {
    await supabase.from('pete_master').insert({
      category: 'person',
      value: payload.name.trim(),
    });
  } catch (e) {
    // Ignore duplicate error if person already exists in pete_master
  }

  return true;
}

/**
 * Updates an existing user record in public.pete_users table.
 */
export async function updateUserInSupabase(
  id: string,
  updates: {
    name?: string;
    username?: string;
    password?: string;
    role?: string;
    pages?: string[];
  }
): Promise<boolean> {
  const finalUpdates: any = { ...updates };
  if (updates.role === 'admin' && Array.isArray(updates.pages)) {
    const updatedPages = [...updates.pages];
    if (!updatedPages.includes('settings')) updatedPages.push('settings');
    if (!updatedPages.includes('master')) updatedPages.push('master');
    finalUpdates.pages = updatedPages;
  }

  const { error } = await supabase
    .from('pete_users')
    .update(finalUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating user:', error);
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return true;
}

/**
 * Deletes a user from public.pete_users table by UUID.
 */
export async function deleteUserFromSupabase(id: string): Promise<boolean> {
  const { error } = await supabase.from('pete_users').delete().eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    throw new Error(`Failed to delete user: ${error.message}`);
  }

  return true;
}
