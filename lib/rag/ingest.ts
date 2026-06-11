import * as cheerio from "cheerio";
import manifest from "@/data/source-manifest.json";
import { serviceClient } from "@/lib/db";
import { embedBatch } from "@/lib/rag/embed";

/**
 * Corpus ingestion: fetch every manifest source, extract readable text +
 * embedded JSON-LD facts, chunk it, embed it, and (re)write the corpus table.
 *
 * Idempotent: a non-dry run deletes all corpus rows EXCEPT doc_type
 * 'fee_explainer' (those are owned by Pillar 2's refresh mechanism), then
 * inserts a fresh set. A dry run does fetch+extract+chunk + COUNT only — no
 * embedding calls, no DB writes — so it can be verified for free.
 */

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 20_000;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;
const MIN_CHUNK_CHARS = 50;

interface ManifestSource {
  url: string;
  title: string;
  publisher: string;
  doc_type: string;
  scheme: string | null;
  last_checked: string;
}

export interface IngestResult {
  inserted: number;
  chunks: number;
  skipped: { url: string; status: number }[];
  /** per-URL chunk counts, for the CLI summary. */
  perUrl: { url: string; chunks: number }[];
}

const sources = (manifest as { sources: ManifestSource[] }).sources;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Recursively pull human-readable strings out of a parsed JSON-LD value. */
function collectJsonLdStrings(node: unknown, out: string[]): void {
  if (typeof node === "string") {
    const t = node.trim();
    if (t.length > 1 && !/^https?:\/\//i.test(t)) out.push(t);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdStrings(item, out);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      // Skip noisy structural keys; keep human-facing fields.
      if (key.startsWith("@") || key === "url" || key === "image" || key === "logo") {
        continue;
      }
      collectJsonLdStrings(value, out);
    }
  }
}

/** Extract readable page text plus any embedded JSON-LD facts. */
function extractText(html: string): string {
  const $ = cheerio.load(html);

  // Pull JSON-LD facts BEFORE we strip <script> tags.
  const ldStrings: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      collectJsonLdStrings(JSON.parse(raw), ldStrings);
    } catch {
      // Malformed JSON-LD — ignore, keep going.
    }
  });

  $("script, style, nav, footer, header, noscript").remove();
  const bodyText = $("body").text() || $.root().text();

  const parts = [bodyText, ...ldStrings].join("\n");
  // Collapse whitespace runs into single spaces, preserve paragraph breaks.
  return parts
    .replace(/\r/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .replace(/[ ]*\n[ ]*/g, "\n")
    .trim();
}

/**
 * Chunk text to ~CHUNK_SIZE chars on paragraph/sentence boundaries with
 * ~CHUNK_OVERLAP overlap. Skips empty/tiny fragments.
 */
function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) {
    return text.length >= MIN_CHUNK_CHARS ? [text] : [];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);

    if (end < text.length) {
      // Prefer breaking on a paragraph, then sentence, then whitespace.
      const window = text.slice(start, end);
      const para = window.lastIndexOf("\n\n");
      const sentence = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
        window.lastIndexOf("\n"),
      );
      const space = window.lastIndexOf(" ");
      const breakAt =
        para > CHUNK_SIZE * 0.5
          ? para
          : sentence > CHUNK_SIZE * 0.5
            ? sentence + 1
            : space > CHUNK_SIZE * 0.5
              ? space
              : -1;
      if (breakAt > 0) end = start + breakAt;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length >= MIN_CHUNK_CHARS) chunks.push(chunk);

    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

async function fetchSource(url: string): Promise<{ ok: boolean; status: number; html: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, status: res.status, html: "" };
    const html = await res.text();
    return { ok: true, status: res.status, html };
  } catch {
    // Network error / timeout — treat as a skip with status 0.
    return { ok: false, status: 0, html: "" };
  } finally {
    clearTimeout(timer);
  }
}

interface PendingRow {
  doc_type: string;
  scheme: string | null;
  title: string;
  url: string;
  content: string;
  last_checked: string;
}

export async function ingestCorpus(
  opts?: { dryRun?: boolean },
): Promise<IngestResult> {
  const dryRun = opts?.dryRun ?? false;
  const stamp = today();

  const skipped: { url: string; status: number }[] = [];
  const perUrl: { url: string; chunks: number }[] = [];
  const pending: PendingRow[] = [];

  for (const src of sources) {
    const { ok, status, html } = await fetchSource(src.url);
    if (!ok) {
      skipped.push({ url: src.url, status });
      perUrl.push({ url: src.url, chunks: 0 });
      continue;
    }

    const text = extractText(html);
    const chunks = chunkText(text);
    perUrl.push({ url: src.url, chunks: chunks.length });

    for (const content of chunks) {
      pending.push({
        doc_type: src.doc_type,
        scheme: src.scheme,
        title: src.title,
        url: src.url,
        content,
        last_checked: stamp,
      });
    }
  }

  const totalChunks = pending.length;

  if (dryRun) {
    return { inserted: 0, chunks: totalChunks, skipped, perUrl };
  }

  const db = serviceClient();

  // Idempotent refresh: wipe everything except fee_explainer rows.
  const { error: delErr } = await db
    .from("corpus")
    .delete()
    .neq("doc_type", "fee_explainer");
  if (delErr) throw new Error(`Failed to clear corpus: ${delErr.message}`);

  // Embed in batches and insert.
  let inserted = 0;
  const BATCH = 64;
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const vectors = await embedBatch(slice.map((r) => r.content));
    const rows = slice.map((r, j) => ({
      doc_type: r.doc_type,
      scheme: r.scheme,
      title: r.title,
      url: r.url,
      content: r.content,
      // pgvector text format; Postgres casts the string to vector(1536).
      embedding: "[" + vectors[j].join(",") + "]",
      last_checked: r.last_checked,
    }));
    const { error: insErr } = await db.from("corpus").insert(rows);
    if (insErr) throw new Error(`Failed to insert corpus rows: ${insErr.message}`);
    inserted += rows.length;
  }

  return { inserted, chunks: totalChunks, skipped, perUrl };
}
