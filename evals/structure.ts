import { loadStructure } from "@/evals/lib/dataset";
import { type SuiteResult, pass, fail, pending } from "@/evals/lib/report";
import {
  checkBookingCode,
  greetingInterpolatesTopTheme,
  checkWeeklyPulse,
  checkFeeExplainer,
} from "@/evals/lib/structure-checks";

/**
 * eval:structure — output-format contracts.
 *
 * M0 reality: pure/rule-based contracts (booking_code, voice_greeting) have
 * fixtures and run for real now. Pulse + fee-explainer need generated output
 * (M2) so they report pending until their generators exist.
 */
export async function runStructure(): Promise<SuiteResult> {
  const checks = [];
  const ds = loadStructure(); // shape-validated on load — a real assertion
  checks.push(pass("dataset loads + validates", "structure.json conforms to schema"));

  // --- booking_code: canonical regex vs fixtures (real check, no LLM) ---
  const { regex } = ds.contracts.booking_code;
  const badValid = ds.fixtures.booking_code.valid.filter((c) => !checkBookingCode(c, regex));
  const badInvalid = ds.fixtures.booking_code.invalid.filter((c) => checkBookingCode(c, regex));
  if (badValid.length === 0 && badInvalid.length === 0) {
    checks.push(
      pass(
        "booking_code regex",
        `${ds.fixtures.booking_code.valid.length} valid + ${ds.fixtures.booking_code.invalid.length} invalid fixtures classified correctly`,
      ),
    );
  } else {
    checks.push(
      fail(
        "booking_code regex",
        `valid misclassified: [${badValid}]; invalid misclassified: [${badInvalid}]`,
      ),
    );
  }

  // --- voice_greeting: interpolation vs fixtures (real check, no LLM) ---
  const { top_theme, valid, invalid } = ds.fixtures.voice_greeting;
  const greetBadValid = valid.filter((g) => !greetingInterpolatesTopTheme(g, top_theme));
  const greetBadInvalid = invalid.filter((g) => greetingInterpolatesTopTheme(g, top_theme));
  if (greetBadValid.length === 0 && greetBadInvalid.length === 0) {
    checks.push(pass("voice_greeting interpolation", `top theme "${top_theme}" detected correctly`));
  } else {
    checks.push(
      fail(
        "voice_greeting interpolation",
        `valid missing theme: ${greetBadValid.length}; invalid falsely matched: ${greetBadInvalid.length}`,
      ),
    );
  }

  // --- pulse + fee: validate the latest real artifacts in the DB. Graceful:
  //     if the DB/keys are absent (e.g. CI) or nothing is generated yet, report
  //     pending instead of failing, so this suite stays CI-runnable offline. ---
  await checkLatestPulse(ds.contracts.weekly_pulse, checks);
  await checkLatestFeeExplainer(ds.contracts.fee_explainer, checks);

  return { suite: "structure", checks };
}

async function checkLatestPulse(
  c: ReturnType<typeof loadStructure>["contracts"]["weekly_pulse"],
  checks: ReturnType<typeof pass>[],
): Promise<void> {
  try {
    const { serviceClient } = await import("@/lib/db");
    const { data, error } = await serviceClient()
      .from("pulses")
      .select("body, word_count")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const row = data?.[0];
    if (!row) {
      checks.push(pending("weekly_pulse structure", "no pulses row yet — run `npm run reviews`"));
      return;
    }
    const r = checkWeeklyPulse(row.body as string, c);
    checks.push(
      r.ok
        ? pass("weekly_pulse structure", `latest pulse OK (${row.word_count ?? "?"} words)`)
        : fail("weekly_pulse structure", r.issues.join("; ")),
    );
  } catch (e) {
    checks.push(pending("weekly_pulse structure", `DB unavailable: ${(e as Error).message.split("\n")[0]}`));
  }
}

async function checkLatestFeeExplainer(
  c: ReturnType<typeof loadStructure>["contracts"]["fee_explainer"],
  checks: ReturnType<typeof pass>[],
): Promise<void> {
  try {
    const { serviceClient } = await import("@/lib/db");
    const { data, error } = await serviceClient()
      .from("corpus")
      .select("content")
      .eq("doc_type", "fee_explainer")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const row = data?.[0];
    if (!row) {
      checks.push(pending("fee_explainer structure", "no fee_explainer in corpus — run `npm run reviews`"));
      return;
    }
    const r = checkFeeExplainer(row.content as string, c);
    checks.push(
      r.ok
        ? pass("fee_explainer structure + retrievable", "in corpus as doc_type=fee_explainer; format OK")
        : fail("fee_explainer structure", r.issues.join("; ")),
    );
  } catch (e) {
    checks.push(pending("fee_explainer structure", `DB unavailable: ${(e as Error).message.split("\n")[0]}`));
  }
}
