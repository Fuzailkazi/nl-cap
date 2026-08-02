-- 0002: widen eval_runs.suite to cover the split eval suites.
--
-- 0001 constrained suite to ('rag','adversarial','structure','all'), but the
-- suites were later split into retrieval / generation / compliance / injection
-- / structure. The result was silent: evals/run.ts catches the insert failure
-- and prints "(eval_runs not written: ... violates check constraint
-- eval_runs_suite_check)", so 4 of the 5 suites recorded no history at all
-- while still reporting PASS. The dashboard's eval-history view was therefore
-- only ever showing 'structure' and legacy 'rag'/'adversarial' rows.
--
-- The two legacy names are kept so historical rows stay valid.

alter table eval_runs drop constraint if exists eval_runs_suite_check;

alter table eval_runs add constraint eval_runs_suite_check check (
  suite in (
    'retrieval',
    'generation',
    'compliance',
    'injection',
    'structure',
    'all',
    -- legacy names, retained so pre-split rows remain valid
    'rag',
    'adversarial'
  )
);
