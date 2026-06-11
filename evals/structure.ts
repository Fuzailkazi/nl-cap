import { loadStructure } from "@/evals/lib/dataset";
import { type SuiteResult, pass, fail, pending } from "@/evals/lib/report";
import { checkBookingCode, greetingInterpolatesTopTheme } from "@/evals/lib/structure-checks";

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

  // --- pulse + fee: need generated output (M2) ---
  checks.push(pending("weekly_pulse structure", "needs lib/llm/weeklyPulse output (M2)"));
  checks.push(pending("fee_explainer structure", "needs lib/llm/feeExplainer output (M2)"));

  return { suite: "structure", checks };
}
