"use client";

import { useEffect, useState, useCallback } from "react";
import type { ApprovalRow, ApprovalStatus } from "@/lib/contracts";
import { Card, Button, Skeleton } from "@/components/ui";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";

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
      <h1 className="h2">Approval Centre</h1>
      <p className="text-sm text-muted">
        Every MCP action lands here as <em>pending</em>. Approve to execute the side effect; reject
        to discard. Nothing auto-sends.
      </p>

      <div className="mt-4 flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs ${
              filter === f ? "bg-brand text-brand-fg" : "border border-border"
            }`}
          >
            {f}
          </button>
        ))}
        <Button variant="ghost" onClick={load} className="ml-auto text-xs text-muted">
          Refresh
        </Button>
      </div>

      {error && <div className="mt-3 text-sm text-rejected">{error}</div>}

      <div className="mt-4 space-y-3">
        {loading && (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        )}
        {!loading && rows.length === 0 && (
          <Card>
            <span className="text-sm text-muted">No actions{filter !== "all" ? ` (${filter})` : ""} yet.</span>
          </Card>
        )}
        {rows.map((r) => (
          <ApprovalCard key={r.id} row={r} acting={acting === r.id} onDecide={decide} />
        ))}
      </div>
    </div>
  );
}
