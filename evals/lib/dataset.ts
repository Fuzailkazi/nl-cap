import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * Dataset loaders + Zod schemas. eval-compliance owns these. Parsing a dataset
 * is itself a real assertion: a malformed dataset fails the suite at M0, before
 * any prompt exists. Schemas mirror the contracts in CLAUDE.md.
 */

const DATASET_DIR = resolve(process.cwd(), "evals", "datasets");

function loadJson(name: string): unknown {
  const path = resolve(DATASET_DIR, name);
  return JSON.parse(readFileSync(path, "utf8"));
}

// --- golden (eval:rag) -------------------------------------------------------

export const goldenSchema = z.object({
  suite: z.literal("rag"),
  description: z.string(),
  min_cases: z.number().int().positive(),
  cases: z
    .array(
      z.object({
        id: z.string(),
        question: z.string().min(1),
        scheme: z.string().nullable(),
        expected_citation_url: z.string().url(),
        answer_must_contain: z.array(z.string()).min(1),
        max_sentences: z.number().int().positive(),
      }),
    )
    .min(5),
});
export type GoldenDataset = z.infer<typeof goldenSchema>;

// --- adversarial (eval:adversarial) ------------------------------------------

export const adversarialSchema = z.object({
  suite: z.literal("adversarial"),
  description: z.string(),
  refusal_strings: z.object({
    advice: z.string().min(1),
    corpus_miss: z.string().min(1),
    pii_deflection: z.string().min(1),
  }),
  min_cases: z.number().int().positive(),
  cases: z
    .array(
      z.object({
        id: z.string(),
        category: z.enum(["advice", "out_of_scope", "pii"]),
        channel: z.enum(["chat", "voice"]),
        question: z.string().min(1),
        expected_refusal: z.enum(["advice", "corpus_miss", "pii_deflection"]),
        must_not_contain: z.array(z.string()),
      }),
    )
    .min(5),
});
export type AdversarialDataset = z.infer<typeof adversarialSchema>;

// --- structure (eval:structure) ----------------------------------------------

export const structureSchema = z.object({
  suite: z.literal("structure"),
  description: z.string(),
  contracts: z.object({
    weekly_pulse: z.object({
      max_words: z.number().int().positive(),
      required_sections: z.array(z.string()).min(1),
      min_quotes: z.number().int().nonnegative(),
      action_ideas_count: z.number().int().positive(),
    }),
    fee_explainer: z.object({
      bullet_count: z.number().int().positive(),
      source_link_count: z.number().int().positive(),
      ends_with_regex: z.string().min(1),
    }),
    booking_code: z.object({ regex: z.string().min(1) }),
    voice_greeting: z.object({ must_interpolate: z.string().min(1) }),
  }),
  fixtures: z.object({
    booking_code: z.object({
      valid: z.array(z.string()).min(1),
      invalid: z.array(z.string()).min(1),
    }),
    voice_greeting: z.object({
      top_theme: z.string().min(1),
      valid: z.array(z.string()).min(1),
      invalid: z.array(z.string()).min(1),
    }),
  }),
});
export type StructureDataset = z.infer<typeof structureSchema>;

// --- loaders -----------------------------------------------------------------

export const loadGolden = (): GoldenDataset => goldenSchema.parse(loadJson("golden.json"));
export const loadAdversarial = (): AdversarialDataset =>
  adversarialSchema.parse(loadJson("adversarial.json"));
export const loadStructure = (): StructureDataset =>
  structureSchema.parse(loadJson("structure.json"));
