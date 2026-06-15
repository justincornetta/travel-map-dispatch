"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

export type Member = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  signedUpAt: string | null;
  lastSignInAt: string | null;
  isAdmin: boolean;
  /** Count of published posts this account has viewed. */
  viewedPosts: number;
  /** Count of cities where this account has viewed every published post. */
  citiesViewed: number;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MembersTable({
  members,
  totalPosts,
  totalCities,
}: {
  members: Member[];
  totalPosts: number;
  totalCities: number;
}) {
  const [rows, setRows] = useState(members);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(m: Member) {
    if (!confirm(`Permanently remove ${m.firstName ?? m.email}? This deletes their account, likes, and comments.`)) {
      return;
    }
    setBusyId(m.id);
    const res = await fetch(`/api/admin/members/${m.id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((r) => r.filter((x) => x.id !== m.id));
    } else {
      alert("Could not remove that account.");
    }
    setBusyId(null);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-8 text-center text-sm text-stone-600 shadow-sm">
        No one has signed up yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-300 bg-[#fbfaf6] shadow-sm">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            <th className="p-3 font-semibold">Name</th>
            <th className="p-3 font-semibold">Email</th>
            <th className="p-3 font-semibold">Phone</th>
            <th className="p-3 font-semibold">Read</th>
            <th className="p-3 font-semibold">Signed up</th>
            <th className="p-3 font-semibold">Last sign-in</th>
            <th className="p-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-stone-100 last:border-b-0">
              <td className="p-3 font-medium text-stone-900">
                {`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "—"}
                {m.isAdmin ? (
                  <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-600">
                    Admin
                  </span>
                ) : null}
              </td>
              <td className="p-3 text-stone-700">{m.email}</td>
              <td className="p-3 text-stone-700">{m.phone || "—"}</td>
              <td className="p-3">
                <ProgressCell
                  isAdmin={m.isAdmin}
                  viewedPosts={m.viewedPosts}
                  citiesViewed={m.citiesViewed}
                  totalPosts={totalPosts}
                  totalCities={totalCities}
                />
              </td>
              <td className="p-3 text-stone-600">{fmt(m.signedUpAt)}</td>
              <td className="p-3 text-stone-600">{fmt(m.lastSignInAt)}</td>
              <td className="p-3 text-right">
                {m.isAdmin ? null : (
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    disabled={busyId === m.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                  >
                    {busyId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Compact reading-progress readout: a thin bar plus "viewed/total posts" and a
// cities-completed count. Admins aren't tracked, so show a dash.
function ProgressCell({
  isAdmin,
  viewedPosts,
  citiesViewed,
  totalPosts,
  totalCities,
}: {
  isAdmin: boolean;
  viewedPosts: number;
  citiesViewed: number;
  totalPosts: number;
  totalCities: number;
}) {
  if (isAdmin) return <span className="text-stone-400">—</span>;

  const pct = totalPosts > 0 ? Math.round((viewedPosts / totalPosts) * 100) : 0;
  const done = totalPosts > 0 && viewedPosts >= totalPosts;

  return (
    <div className="min-w-[140px]">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200">
          <div
            className={`h-full rounded-full ${done ? "bg-emerald-600" : "bg-emerald-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-stone-700">{pct}%</span>
      </div>
      <p className="mt-1 text-[11px] text-stone-500">
        {viewedPosts}/{totalPosts} post{totalPosts === 1 ? "" : "s"} · {citiesViewed}/{totalCities}{" "}
        cit{totalCities === 1 ? "y" : "ies"}
      </p>
    </div>
  );
}
