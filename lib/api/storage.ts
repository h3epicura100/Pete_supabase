import { supabase } from '@/lib/supabase';

/**
 * Uploads a File object to a specified Supabase Storage bucket and returns the public URL.
 */
export async function uploadFileToSupabase(
  file: File,
  bucketName: 'transaction-proofs' | 'receiving-proofs'
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error(`Error uploading file to ${bucketName}:`, error);
    throw new Error(`File upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
