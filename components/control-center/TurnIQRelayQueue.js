"use client";

import { useMemo } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";

export default function TurnIQRelayQueue({ rows = [], onSendRelay }) {
  const relayItems = useMemo(() => {
    return rows
      .filter((row) => row.relayApproved === true)
      .filter((row) => ["queued", "sending"].includes(row.relayStatus))
      .map((row) => ({
        row,
        id: row.id,
        property: row.name,
        market: row.market,
        status: row.relayStatus || "queued",
        action:
          row.relayTitle ||
          row.actionEngine?.headline ||
          row.nextAction ||
          "Execute recommendation",
        destination: row.relayDestination || "Operator",
        daysRecovered: row.actionEngine?.daysRecovered || 0,
        revenueRecovered: row.actionEngine?.revenueRecovered || 0,
      }));
  }, [rows]);

  if (!relayItems.length) return null;

  return (
    <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
            TurnIQ Relay
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            Approved actions queued for execution
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Relay turns approved recommendations into outbound operating moves.
          </div>
        </div>

        <Pill tone="blue">{relayItems.length} active</Pill>
      </div>

      <div className="mt-5 space-y-3">
        {relayItems.map((item) => {
          const isSending = item.status === "sending";

          return (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.action}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {item.property} • {item.market} • Destination: {item.destination}
                  </div>
                </div>

                <Pill tone={isSending ? "blue" : "amber"}>
                  {isSending ? "Sending" : "Queued for Relay"}
                </Pill>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Relay status
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {isSending ? "Sending now..." : "Ready to send"}
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-emerald-700">
                    Days protected
                  </div>
                  <div className="mt-1 font-semibold text-emerald-800">
                    +{item.daysRecovered}d
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-blue-700">
                    Revenue protected
                  </div>
                  <div className="mt-1 font-semibold text-blue-800">
                    ${item.revenueRecovered.toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSendRelay?.(item.row)}
                disabled={isSending}
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Send Relay"}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}