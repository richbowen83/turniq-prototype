"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { formatShortDate } from "../../utils/economics";

function toneDays(value) {
  if (value == null) return "text-slate-400";
  if (value < 0) return "text-red-600 font-medium";
  if (value <= 3) return "text-amber-600 font-medium";
  return "text-slate-700";
}

function rowBackground(row, variant) {
  if (variant === "upcoming" && (!row.assignedVendor || row.assignedVendor === "TBD")) {
    return "bg-amber-50/40";
  }
  if (row.turnStatus === "Blocked") return "bg-red-50/40";
  if (row.overdue) return "bg-amber-50/30";
  return "";
}

function getLaneBadge(row, variant) {
  if (variant === "upcoming") {
    if (row.turnStatus === "Blocked") return { label: "Blocked", tone: "red" };
    if (!row.assignedVendor || row.assignedVendor === "TBD") {
      return { label: "Needs vendor", tone: "amber" };
    }
    return { label: "Planned", tone: "green" };
  }

  if (row.currentStage === "Failed Rent Ready") {
    return { label: "Failed RRI", tone: "red" };
  }
  if (row.turnStatus === "Blocked") return { label: "Blocked", tone: "red" };
  if (row.overdue) return { label: "Over SLA", tone: "amber" };
  return { label: "In flight", tone: "slate" };
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
      <span className="mt-1 text-xs text-slate-400">{row.market}</span>
    </div>
  );
}

function ControlsCell({
  row,
  variant,
  openRow,
  onPreAssignVendor,
  moveToUpcoming,
  moveOutOfUpcoming,
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => openRow(row)}
        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Open
      </button>

      {variant === "upcoming" && !row.assignedVendor ? (
        <button
          onClick={() => onPreAssignVendor(row)}
          className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
        >
          Pre-assign vendor
        </button>
      ) : null}

      {variant === "active" ? (
        <button
          onClick={() => moveToUpcoming(row.id)}
          className="text-left text-xs text-blue-600 hover:underline"
        >
          Move → Upcoming
        </button>
      ) : (
        <button
          onClick={() => moveOutOfUpcoming(row.id)}
          className="text-left text-xs text-slate-500 hover:underline"
        >
          Move to Active
        </button>
      )}
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
  onPreAssignVendor,
  moveToUpcoming,
  moveOutOfUpcoming,
}) {
  return (
    <Card className={variant === "upcoming" ? "border-blue-200" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill tone={variant === "upcoming" ? "blue" : "slate"}>
            {variant === "upcoming" ? "Planning lane" : "Execution lane"}
          </Pill>
          <Pill tone="slate">{rows.length} turns</Pill>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[1280px] w-full text-sm">
          <thead className="sticky top-0 z-10 border-b bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Address</th>
              <th className="px-4 py-3 font-medium">Move Out</th>
              <th className="px-4 py-3 font-medium">
  {variant === "upcoming" ? "Days to Move Out" : "Days in Stage"}
</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Next Action</th>
              <th className="px-4 py-3 font-medium">ECD</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Controls</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const laneBadge = getLaneBadge(row, variant);

              return (
                <tr
                  key={row.id}
                  className={`border-t border-slate-100 align-top transition hover:bg-slate-50 ${
                    rowBackground(row, variant)
                  } ${selectedPropertyId === row.id ? "bg-slate-50" : ""}`}
                >
                  <td className="px-4 py-4">
                    <AddressCell row={row} openRow={openRow} />
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-slate-900">
                      {row.moveOutDate ? formatShortDate(row.moveOutDate) : "—"}
                    </div>
                  </td>

                  <td
  className={`px-4 py-4 ${
    variant === "upcoming"
      ? toneDays(row.daysToMoveOut)
      : row.overdue
      ? "text-red-600 font-medium"
      : "text-slate-700"
  }`}
>
  {variant === "upcoming" ? row.daysToMoveOut ?? "—" : row.daysInStage ?? "—"}

  {variant === "active" ? (
    <div className="mt-1 text-xs text-slate-400">SLA {row.stageSla}d</div>
  ) : null}
</td>

                  <td className="px-4 py-4">
  <div className="font-medium text-slate-900">{row.currentStage}</div>
</td>

                  <td className="px-4 py-4">
                    <div className="text-slate-900">{row.assignedVendor || "Unassigned"}</div>
                    {!row.assignedVendor && row.suggestedVendor ? (
                      <div className="mt-1 text-xs text-slate-400">
                        Suggested: {row.suggestedVendor}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900">{row.nextAction}</div>
                    {row.blocker && row.blocker !== "None" ? (
                      <div className="mt-1 text-xs text-slate-400">{row.blocker}</div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-slate-900">
                      {row.projectedCompletion
                        ? formatShortDate(row.projectedCompletion)
                        : "—"}
                    </div>
                    <div className={`mt-1 text-xs ${toneDays(row.daysToEcd)}`}>
                      {row.daysToEcd != null ? `${row.daysToEcd}d` : "—"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <Pill tone={laneBadge.tone}>{laneBadge.label}</Pill>
                  </td>

                  <td className="px-4 py-4">
                    <ControlsCell
                      row={row}
                      variant={variant}
                      openRow={openRow}
                      onPreAssignVendor={onPreAssignVendor}
                      moveToUpcoming={moveToUpcoming}
                      moveOutOfUpcoming={moveOutOfUpcoming}
                    />
                  </td>
                </tr>
              );
            })}

            {!rows.length ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                  No turns in this lane.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}