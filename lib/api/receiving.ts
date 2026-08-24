import { supabase } from '@/lib/supabase';
import { uploadFileToSupabase } from './storage';

export interface ReceivingRecord {
  id: string;
  timestamp: string;
  date: string;
  vendorName: string;
  invoiceAmt: number;
  invoiceNumber: string;
  mode: string;
  remarks: string;
  imageLink?: string;
}

export interface NewReceivingPayload {
  date: string;
  vendorName: string;
  invoiceAmt: number;
  invoiceNumber: string;
  mode: string;
  remarks: string;
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
 * Fetches all receiving records from Supabase pete_receiving_entries table.
 */
export async function fetchReceivingRecordsFromSupabase(): Promise<ReceivingRecord[]> {
  const { data, error } = await supabase
    .from('pete_receiving_entries')
    .select('*')
    .order('entry_date', { ascending: false });

  if (error) {
    console.error('Error fetching receiving entries:', error);
    throw new Error(`Failed to fetch receiving records: ${error.message}`);
  }

  if (!data) return [];

  return data.map((row: any) => {
    const dateObj = row.entry_date ? new Date(row.entry_date) : null;
    const isValidDate = dateObj && !isNaN(dateObj.getTime());
    const dateStr = isValidDate ? dateObj.toISOString().split('T')[0] : (row.entry_date || '');
    const createdTimestamp = isValidDate
      ? dateObj.toLocaleString('en-GB')
      : row.created_at
      ? new Date(row.created_at).toLocaleString('en-GB')
      : '';

    return {
      id: row.id,
      timestamp: createdTimestamp,
      date: dateStr,
      vendorName: row.vendor_name || '',
      invoiceAmt: Number(row.invoice_amount) || 0,
      invoiceNumber: row.invoice_number || '',
      mode: row.mode || '',
      remarks: row.remarks || '',
      imageLink: row.image_url || undefined,
    };
  });
}

/**
 * Inserts a new receiving record into Supabase, uploading invoice image if provided.
 * Resolves vendor_id and mode_id automatically from public.pete_master.
 */
export async function insertReceivingEntryToSupabase(
  payload: NewReceivingPayload,
  imageFile: File | null
): Promise<boolean> {
  let imageUrl = '';
  if (imageFile) {
    imageUrl = await uploadFileToSupabase(imageFile, 'receiving-proofs');
  }

  // Look up foreign key UUIDs for vendor and mode from pete_master table in parallel
  const [vendorRes, modeRes] = await Promise.all([
    payload.vendorName.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'vendor').ilike('value', payload.vendorName.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
    payload.mode.trim()
      ? supabase.from('pete_master').select('id').eq('category', 'mode').ilike('value', payload.mode.trim()).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const entryDateTimestamptz = formatToTimestamptz(payload.date);

  const { error } = await supabase.from('pete_receiving_entries').insert({
    entry_date: entryDateTimestamptz,
    vendor_name: payload.vendorName,
    vendor_id: vendorRes.data?.id || null,
    invoice_amount: payload.invoiceAmt,
    invoice_number: payload.invoiceNumber,
    mode: payload.mode,
    mode_id: modeRes.data?.id || null,
    remarks: payload.remarks,
    image_url: imageUrl,
  });

  if (error) {
    console.error('Error inserting receiving entry:', error);
    throw new Error(`Failed to insert receiving entry: ${error.message}`);
  }

  return true;
}
