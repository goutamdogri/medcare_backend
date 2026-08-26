import { query } from '../../config/database.js';

export interface DigestRow {
  review_mode: string;
  surge_regions: string | null;
  red_alert_count: number;
  digest_text: string;
  model_used: string | null;
}

/** Single digest row per run (unique on as_of_date). */
export async function fetchDigest(asOf: string): Promise<DigestRow | null> {
  const result = await query<DigestRow>(
    `SELECT review_mode, surge_regions, red_alert_count, digest_text, model_used
     FROM alert_digest WHERE as_of_date = $1`,
    [asOf],
  );
  return result.rows[0] ?? null;
}
