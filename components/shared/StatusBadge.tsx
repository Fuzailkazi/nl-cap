import { Badge } from "@/components/ui";
import type { ApprovalStatus } from "@/lib/contracts";

// Soft tinted fills — easier to scan than thin outlines.
const COLOR: Record<ApprovalStatus, string> = {
  pending: "bg-pending/10 text-pending",
  approved: "bg-approved/10 text-approved",
  rejected: "bg-rejected/10 text-rejected",
};

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  return <Badge className={COLOR[status]}>{status}</Badge>;
}
