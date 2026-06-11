import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { serviceClient } from "@/lib/db";
import { type ReviewInput, detectPII } from "@/lib/contracts";

/**
 * Pillar 2 — reviews ingestion. Parses data/reviews.csv, scrubs/skips any row
 * that contains PII (defence in depth — the source is authored PII-free), and
 * loads the `reviews` table. NO PII ever reaches the DB.
 */

export interface ReviewRow {
  review_id: string;
  review_date: string;
  scheme: string;
  channel: string;
  rating: number;
  review_title: string | null;
  review_text: string;
  language: string;
}

export function parseReviewsCsv(): { rows: ReviewRow[]; skippedPII: string[] } {
  const csv = readFileSync(resolve(process.cwd(), "data", "reviews.csv"), "utf8");
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    comment: "#",
    trim: true,
  }) as Record<string, string>[];

  const rows: ReviewRow[] = [];
  const skippedPII: string[] = [];
  for (const r of records) {
    const text = r.review_text ?? "";
    if (detectPII(text) || detectPII(r.review_title ?? "")) {
      skippedPII.push(r.review_id);
      continue;
    }
    rows.push({
      review_id: r.review_id,
      review_date: r.review_date,
      scheme: r.scheme,
      channel: r.channel,
      rating: Number(r.rating),
      review_title: r.review_title?.trim() ? r.review_title : null,
      review_text: text,
      language: r.language || "en",
    });
  }
  return { rows, skippedPII };
}

/** Replace the reviews table with the (PII-scrubbed) CSV contents. */
export async function ingestReviews(): Promise<{ inserted: number; skippedPII: string[] }> {
  const { rows, skippedPII } = parseReviewsCsv();
  const db = serviceClient();
  const { error: delErr } = await db.from("reviews").delete().gte("rating", 0);
  if (delErr) throw new Error(`reviews delete failed: ${delErr.message}`);
  const { error } = await db.from("reviews").insert(rows);
  if (error) throw new Error(`reviews insert failed: ${error.message}`);
  return { inserted: rows.length, skippedPII };
}

/** Load reviews from the DB as weeklyPulse inputs. */
export async function getReviewInputs(): Promise<ReviewInput[]> {
  const db = serviceClient();
  const { data, error } = await db
    .from("reviews")
    .select("scheme, channel, rating, review_title, review_text");
  if (error) throw new Error(`reviews read failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    scheme: r.scheme as string,
    channel: r.channel as string,
    rating: r.rating as number,
    title: (r.review_title as string | null) ?? null,
    text: r.review_text as string,
  }));
}

/** Load reviews straight from CSV as weeklyPulse inputs (no DB needed — used by evals). */
export function getReviewInputsFromCsv(): ReviewInput[] {
  return parseReviewsCsv().rows.map((r) => ({
    scheme: r.scheme,
    channel: r.channel,
    rating: r.rating,
    title: r.review_title,
    text: r.review_text,
  }));
}
