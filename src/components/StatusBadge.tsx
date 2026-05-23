import type { StopStatus } from "@/lib/types";
import { statusLabel } from "@/lib/utils";

const styles: Record<StopStatus, string> = {
  visited: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  current: "bg-amber-100 text-amber-950 ring-amber-200",
  upcoming: "bg-slate-100 text-slate-800 ring-slate-200",
};

export function StatusBadge({ status }: { status: StopStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ${styles[status]}`}>
      {statusLabel(status)}
    </span>
  );
}
