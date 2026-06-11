import { Badge } from "@/components/ui";
import type { ApprovalStatus } from "@/lib/contracts";

const COLOR: Record<ApprovalStatus, string> = {
  pending: "border border-pending text-pending",
  approved: "border border-approved text-approved",
  rejected: "border border-rejected text-rejected",
};

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  return <Badge className={COLOR[status]}>{status}</Badge>;
}
