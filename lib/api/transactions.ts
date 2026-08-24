import { supabase } from '@/lib/supabase';
import { uploadFileToSupabase } from './storage';

export interface Transaction {
  id: string;
  timestamp: string;
  personName: string;
  userId: string;
  date: string;
  incoming: number;
  outgoing: number;
  mode: string;
  groupHead: string;
  reason: string;
  photoLink: string;
  monthName: string;
  formattedDate: string;
}

export interface NewTransactionPayload {
  personName: string;
  date: string;
  incoming: number;
  outgoing: number;
  mode: string;
  groupHead: string;
  reason: string;
}

/**
 * Combines a date string (e.g. "2026-08-24") with the current time of day
 * to produce a full ISO TIMESTAMPTZ string for PostgreSQL.
 */
function formatToTimestamptz(dateInput: string): string {
  if (!dateInput) return new Date().toISOString();
  if (dateInput.includes('T')) return new Date(dateInput).toISOString();

  const now = new Date();
  const parts = dateInput.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [year, month, day] = parts;
    const combined = new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );
    return combined.toISOString();
  }

  const parsed = new Date(dateInput);
  return !isNaN(parsed.getTime()) ? parsed.toISOString() : now.toISOString();
}

/**
 * Fetches all transaction records from Supabase pete_transactions table.
 */
export async function fetchTransactionsFromSupabase(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('pete_transactions')
    .select('*')
    .order('entry_date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  if (!data) return [];

  return data.map((row: any) => {
    const dateObj = row.entry_date ? new Date(row.entry_date) : null;
    const isValidDate = dateObj && !isNaN(dateObj.getTime());
    const dateStr = isValidDate ? dateObj.toISOString().split('T')[0] : (row.entry_date || '');
    const formattedDate = isValidDate ? dateObj.toLocaleDateString('en-GB') : '';
    const createdTimestamp = isValidDate
      ? dateObj.toLocaleString('en-GB')
      : row.created_at
      ? new Date(row.created_at).toLocaleString('en-GB')
      : '';

    return {
      id: row.id,
      timestamp: createdTimestamp,
      date: dateStr,
      formattedDate: formattedDate,
      personName: row.person_name || '',
      userId: row.person_name || '',
      incoming: Number(row.incoming) || 0,
      outgoing: Number(row.outgoing) || 0,
      mode: row.mode || '',
      groupHead: row.group_head || '',
      reason: row.reason || '',
      photoLink: row.photo_url || '',
      monthName: row.month_name || '',
    };
  });
}

/**
 * Inserts a new transaction into Supabase, uploading proof photo if provided.
 * Resolves person_id, mode_id, and group_head_id automatically from public.pete_master.
 */
export async function insertTransactionToSupabase(
  payload: NewTransactionPayload,
  photoFile: File | null
): Promise<boolean> {
  let photoUrl = '';
  if (photoFile) {
    photoUrl = await uploadFileToSupabase(photoFile, 'transaction-proofs');
  }

  // Look up foreign key UUIDs for person, mode, and group_head from pete_master table in parallel
  const [personRes, modeRes, groupRes] = await Promise.all([
    payload.personName.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'person').ilike('value', payload.personName.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
    payload.mode.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'mode').ilike('value', payload.mode.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
    payload.groupHead.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'group_head').ilike('value', payload.groupHead.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const entryDateTimestamptz = formatToTimestamptz(payload.date);

  const { error } = await supabase.from('pete_transactions').insert({
    entry_date: entryDateTimestamptz,
    person_name: payload.personName,
    person_id: personRes.data?.id || null,
    incoming: payload.incoming,
    outgoing: payload.outgoing,
    mode: payload.mode,
    mode_id: modeRes.data?.id || null,
    group_head: payload.groupHead,
    group_head_id: groupRes.data?.id || null,
    reason: payload.reason,
    photo_url: photoUrl,
  });

  if (error) {
    console.error('Error inserting transaction:', error);
    throw new Error(`Failed to insert transaction: ${error.message}`);
  }

  return true;
}
