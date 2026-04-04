"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { formatShortDate } from "../../utils/economics";

const STAGE_OPTIONS = [
  "Pre-Leasing",
  "Pre-Move Out Inspection",
  "Move Out Inspection",
  "Scope Review",
  "Owner Approval",
  "Dispatch",
  "Pending RRI",
  "Rent Ready Open",
  "Failed Rent Ready",
];

const TURN_STATUS_OPTIONS = ["Monitoring", "Blocked", "Ready"];

function toneDays(v) {
  if (v == null) return "text-slate-400";
  if (v < 0) return "text-red-600 font-medium";
  if (v < 3) return "text-amber-600 font-medium";
  return "text-slate-700";
}

function rowTone(row, variant) {
  if (variant === "upcoming") return "bg-blue-50/30";
  if (row.priority?.label === "Critical") return "bg-red-50/40";
  if (row.daysToEcd != null && row.daysToEcd < 3)
    return "bg-amber-50/40";
  return "";
}

function AddressCell({ row, openRow }) {
  return (
    <div className="flex flex-col">
      <button
        onClick={() => openRow(row)}
        className="text-left font-semibold text-blue-700 hover:underline"
      >
        {row.name}
      </button>
      <span className="text-xs text-slate-400">
        Open turn details →
      </span>
    </div>
  );
}

function ImpactCell({ row }) {
  if (!row.impact) return <span className="text-slate-400">—</span>;

  return (
    <div className="text-xs">
      <div className="font-medium">{row.impact.daysRecovered}d</div>
      <div className="text-slate-400">
        ${Math.round(row.impact.revenueRecovered)}
      </div>
    </div>
  );
}

export default function PipelineTable({
  title,
  subtitle,
  rows,
  variant,
  openRow,
  selectedPropertyId,
  onVendorChange,
  onNextActionChange,
  onPreAssignVendor,
  moveToUpcoming,
  moveOutOfUpcoming,
}) {
  return (
    <Card className={variant === "upcoming" ? "border-blue-200" : ""}>
      <div className="flex justify-between">
        <div>
          <div className="text-2xl font-semibold">{title}</div>
          <div className="text-sm text-slate-500">{subtitle}</div>

          <div className="mt-2 flex gap-2">
            <Pill tone={variant === "upcoming" ? "blue" : "slate"}>
              {variant === "upcoming" ? "Planning lane" : "Execution lane"}
            </Pill>
            <Pill tone="slate">
              {variant === "upcoming"
                ? "≤ 21 days to move-out"
                : "Outside planning window"}
            </Pill>
          </div>
        </div>

        <Pill tone={variant === "upcoming" ? "blue" : "slate"}>
          {rows.length} turns
        </Pill>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[2600px] w-full text-sm">
          <thead className="sticky top-0 bg-white z-10 text-left text-slate-500 border-b">
            <tr>
              <th className="px-4 py-3">Address</th>
              <th>Market</th>
              <th>Move Out</th>
              <th>Days</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Vendor</th>
              <th>Next Action</th>
              <th>ECD</th>
              <th>Impact</th>
              <th>Controls</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`
                  border-t transition-all duration-200
                  hover:bg-slate-50
                  ${rowTone(row, variant)}
                  ${selectedPropertyId === row.id ? "bg-slate-50" : ""}
                `}
              >
                {/* Address */}
                <td className="px-4 py-4">
                  <AddressCell row={row} openRow={openRow} />
                </td>

                <td>{row.market}</td>

                {/* Move Out */}
                <td>
                  <input
                    type="date"
                    value={row.moveOutDate?.slice(0, 10) || ""}
                    onChange={(e) =>
                      row.updateProperty?.(row.id, {
                        moveOutDate: e.target.value || null,
                      })
                    }
                    className="border rounded px-2 py-1"
                  />
                </td>

                {/* Days */}
                <td className={toneDays(row.daysToMoveOut)}>
                  {row.daysToMoveOut ?? "—"}
                </td>

                {/* Stage */}
                <td>
                  <select
                    value={row.currentStage}
                    onChange={(e) =>
                      row.updateProperty?.(row.id, {
                        currentStage: e.target.value,
                      })
                    }
                  >
                    {STAGE_OPTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>

                {/* Status */}
                <td>
                  <select
                    value={row.turnStatus}
                    onChange={(e) =>
                      row.updateProperty?.(row.id, {
                        turnStatus: e.target.value,
                      })
                    }
                  >
                    {TURN_STATUS_OPTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>

                {/* Vendor */}
                <td>
                  <div className="flex flex-col gap-1">
                    <input
                      value={row.assignedVendor || ""}
                      onChange={(e) =>
                        onVendorChange(row.id, e.target.value)
                      }
                      placeholder={row.suggestedVendor}
                      className="border rounded px-2 py-1"
                    />

                    {!row.assignedVendor && (
                      <button
                        onClick={() =>
                          onVendorChange(row.id, row.suggestedVendor)
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Use suggestion
                      </button>
                    )}

                    {variant === "upcoming" && !row.assignedVendor && (
                      <button
                        onClick={() => onPreAssignVendor(row)}
                        className="text-xs text-slate-600 hover:underline"
                      >
                        Pre-assign
                      </button>
                    )}
                  </div>
                </td>

                {/* Next Action */}
                <td>
                  <select
                    value={row.nextAction}
                    onChange={(e) =>
                      onNextActionChange(row.id, e.target.value)
                    }
                  >
                    {row.nextActionOptions.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </td>

                {/* ECD */}
                <td>{formatShortDate(row.projectedCompletion)}</td>

                {/* Impact */}
                <td>
                  <ImpactCell row={row} />
                </td>

                {/* Controls */}
                <td>
                  <div className="flex flex-col gap-2">
                    {variant === "active" && (
                      <button
                        onClick={() => moveToUpcoming(row.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Move → Upcoming
                      </button>
                    )}

                    {variant === "upcoming" && (
                      <button
                        onClick={() => moveOutOfUpcoming(row.id)}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Move to Active
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-500">
                  No turns in this lane. Adjust Move Out Dates or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}