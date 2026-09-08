import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

import { supabase } from './supabase';

interface CategoryResult {
  score: number;
  potentialScore: number;
  recommendations: { title: string; rationale: string; how_to: string }[];
}

export interface AnalyzeScanResult {
  scanId: string;
  provider: string;
  model: string;
  detectedSkinTone: { mstScale: number; label: string };
  overallScore: number;
  overallPotentialScore: number;
  categories: {
    hair: CategoryResult | null;
    brows: CategoryResult | null;
    skin: CategoryResult | null;
    makeup: CategoryResult | null;
  };
}

// Mirrors the analyze-scan Edge Function's contract (supabase/functions/analyze-scan/index.ts):
// the client generates the scan id and uploads the photo itself, at the exact storage path the
// storage RLS policy expects (`{userId}/{scanId}.jpg`), then hands the function only the id.
export async function submitScan(photoUri: string, makeupOn: boolean): Promise<AnalyzeScanResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You need to be signed in to run a scan.');
  }

  const scanId = Crypto.randomUUID();
  const storagePath = `${session.user.id}/${scanId}.jpg`;

  const file = new File(photoUri);
  const photoBytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('scan-photos')
    .upload(storagePath, photoBytes, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) {
    throw new Error(`Photo upload failed: ${uploadError.message}`);
  }

  const { data, error: invokeError } = await supabase.functions.invoke('analyze-scan', {
    body: { scanId, makeupOn },
  });
  if (invokeError) {
    throw new Error(await describeFunctionError(invokeError));
  }

  return data as AnalyzeScanResult;
}

async function describeFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context;
  if (context) {
    try {
      const body = (await context.json()) as { error?: string };
      if (typeof body.error === 'string') return body.error;
    } catch {
      // fall through to the generic message below
    }
  }
  return error instanceof Error ? error.message : 'Scan analysis failed.';
}
