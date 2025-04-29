/**
 * Supabase client configuration and initialization
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate that credentials are available
if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase credentials. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

// Create and export Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Export typed versions of common database operations
export const addRecord = async <T>(table: string, data: any): Promise<T> => {
  const { data: result, error } = await supabase.from(table).insert(data).select().single();
  
  if (error) {
    throw error;
  }
  
  return result as T;
};

export const getRecord = async <T>(table: string, id: string): Promise<T | null> => {
  const { data: result, error } = await supabase.from(table).select('*').eq('id', id).single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is the "not found" error
    throw error;
  }
  
  return result as T;
};

export const updateRecord = async <T>(table: string, id: string, data: any): Promise<T> => {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return result as T;
};

export const deleteRecord = async (table: string, id: string): Promise<void> => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  
  if (error) {
    throw error;
  }
};

export default supabase;
