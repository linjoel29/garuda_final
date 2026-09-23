import crypto from 'crypto';
import { supabase } from '../config/db';

export function generateUUID(): string {
  return crypto.randomUUID();
}

export async function initDatabase() {
  console.log('[Supabase] Backend database client initialized via @supabase/supabase-js');
}

export { supabase };
