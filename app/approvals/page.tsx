"use client";

import { useEffect, useState, useCallback } from "react";
import type { ApprovalRow, ApprovalStatus } from "@/lib/contracts";
import { StatusBadge, cardClass, cardStyle } from "@/app/components/ui";

const FILTERS: (ApprovalStatus | "all")[] = ["all", "pending", "approved", "rejected"];

export default function ApprovalsPage() {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/approvals${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setRows(data.actions as ApprovalRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: number, decision: "approve" | "reject") {
    setActing(id);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">Approval Centre</h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Every MCP action lands here as <em>pending</em>. Approve to execute the side effect; reject
        to discard. Nothing auto-sends.
      </p>

      <div className="mt-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-full px-3 py-1 text-xs"
            style={
              filter === f
                ? { background: "var(--color-brand)", color: "var(--color-brand-fg)" }
                : { border: "1px solid var(--border)" }
            }
          >
            {f}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-xs underline" style={{ color: "var(--muted)" }}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-3 text-sm" style={{ color: "var(--color-rejected)" }}>
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading && <div className="text-sm" style={{ color: "var(--muted)" }}>Loading…</div>}
        {!loading && rows.length === 0 && (
          <div className={cardClass} style={cardStyle}>
            <span className="text-sm" style={{ color: "var(--muted)" }}>No actions{filter !== "all" ? ` (${filter})` : ""} yet.</span>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className={cardClass} style={cardStyle}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-sm">
                #{r.id} · {r.tool}
              </div>
              <StatusBadge status={r.status} />
            </div>
            <pre
              className="mt-2 overflow-x-auto rounded-md p-2 text-xs"
              style={{ background: "var(--background)" }}
            >
              {JSON.stringify(r.payload, null, 2)}
            </pre>
            {r.status === "pending" ? (
              <div className="mt-2 flex gap-2">
                <button
                  disabled={acting === r.id}
                  onClick={() => decide(r.id, "approve")}
                  className="rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--color-approved)" }}
                >
                  Approve
                </button>
                <button
                  disabled={acting === r.id}
                  onClick={() => decide(r.id, "reject")}
                  className="rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--color-rejected)" }}
                >
                  Reject
                </button>
              </div>
            ) : (
              r.result != null && (
                <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                  result: {JSON.stringify(r.result)}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
