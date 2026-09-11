import * as Crypto from 'expo-crypto';
import * as LegacyFileSystem from 'expo-file-system/legacy';

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
// the client sends the photo as base64 bytes in the request body itself, rather than uploading
// it to Storage first. The function runs the content-safety check on those bytes in memory and
// only writes to Storage — via its own service-role client, at the path it derives itself —
// after a safe verdict and a successful analysis. This is deliberate: nothing the client can read
// (or that persists at all) exists until a safety verdict has actually been made. The client no
// longer has (or needs) a Storage insert policy for `scan-photos`.
export async function submitScan(photoUri: string, makeupOn: boolean): Promise<AnalyzeScanResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You need to be signed in to run a scan.');
  }

  const scanId = Crypto.randomUUID();
  const photoBase64 = await LegacyFileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });

  const { data, error: invokeError } = await supabase.functions.invoke('analyze-scan', {
    body: { scanId, makeupOn, photoBase64 },
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
