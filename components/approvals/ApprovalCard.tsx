import { Card, Button } from "@/components/ui";
import { StatusBadge } from "@/components/shared";
import type { ApprovalRow } from "@/lib/contracts";

export function ApprovalCard({
  row,
  acting,
  onDecide,
}: {
  row: ApprovalRow;
  acting: boolean;
  onDecide: (id: number, decision: "approve" | "reject") => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-sm">
          #{row.id} · {row.tool}
        </div>
        <StatusBadge status={row.status} />
      </div>
      <pre className="mt-2 overflow-x-auto rounded-md bg-bg p-2 text-xs">
        {JSON.stringify(row.payload, null, 2)}
      </pre>
      {row.status === "pending" ? (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="success" disabled={acting} onClick={() => onDecide(row.id, "approve")}>
            Approve
          </Button>
          <Button size="sm" variant="danger" disabled={acting} onClick={() => onDecide(row.id, "reject")}>
            Reject
          </Button>
        </div>
      ) : (
        row.result != null && (
          <div className="mt-2 text-xs text-muted">result: {JSON.stringify(row.result)}</div>
        )
      )}
    </Card>
  );
}
