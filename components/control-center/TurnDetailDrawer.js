"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { formatShortDate, shiftDate } from "../../utils/economics";

function getVendorSignal(row) {
  const vendorName = row.vendor || "Unassigned";
  const workOrders = Array.isArray(row.workOrders) ? row.workOrders : [];

  const delayedWorkOrders = workOrders.filter((workOrder) =>
    ["Delayed", "Overdue", "Blocked"].includes(workOrder.status)
  );

  const openWorkOrders = workOrders.filter(
    (workOrder) => !["Completed", "Closed"].includes(workOrder.status)
  );

  const missingVendor = !row.vendor || row.vendor === "TBD" || row.vendor === "Unassigned";

  const vendorRisk =
    missingVendor
      ? "high"
      : delayedWorkOrders.length > 0
      ? "high"
      : openWorkOrders.length >= 2
      ? "medium"
      : "low";

  return {
    vendorName,
    missingVendor,
    delayedWorkOrders,
    openWorkOrders,
    vendorRisk,
    recommendation:
      missingVendor
        ? "Assign a vendor to unlock execution"
        : vendorRisk === "high"
        ? `Current vendor (${vendorName}) is creating delay risk`
        : vendorRisk === "medium"
        ? `Monitor ${vendorName} closely`
        : `${vendorName} looks stable`,
  };
}

function getSimulatorOptions(row) {
  const vendorSignal = getVendorSignal(row);

  return [
    {
      id: "clear_blocker",
      label: "Clear blocker",
      enabled: row.turnStatus === "Blocked" || row.blocker !== "None",
      days: row.turnStatus === "Blocked" || row.blocker !== "None" ? 2 : 0,
      category: "workflow",
    },
    {
      id: "accelerate_approval",
      label: "Accelerate approval",
      enabled: row.currentStage === "Owner Approval",
      days: row.currentStage === "Owner Approval" ? 2 : 0,
      category: "workflow",
    },
    {
      id: "resequence_vendors",
      label: "Re-sequence vendors",
      enabled: (row.daysInStage || 0) > (row.stageSla || 0),
      days:
        (row.daysInStage || 0) > (row.stageSla || 0)
          ? Math.min(2, Math.max(1, (row.daysInStage || 0) - (row.stageSla || 0)))
          : 0,
      category: "vendor",
    },
    {
  id: "switch_vendor",
  label: vendorSignal.missingVendor
    ? "Assign best-fit vendor"
    : "Switch vendor",
      enabled: vendorSignal.missingVendor || vendorSignal.vendorRisk !== "low",
      days:
        vendorSignal.missingVendor
          ? 2
          : vendorSignal.vendorRisk === "high"
          ? 2
          : vendorSignal.vendorRisk === "medium"
          ? 1
          : 0,
      category: "vendor",
    },
    {
      id: "expedite_vendor",
      label: vendorSignal.missingVendor
        ? "Escalate vendor assignment"
         : "Expedite current vendor",
      enabled: vendorSignal.vendorRisk === "high" || vendorSignal.missingVendor,
      days: vendorSignal.vendorRisk === "high" || vendorSignal.missingVendor ? 1 : 0,
      category: "vendor",
    },
    {
      id: "recover_failed_ready",
      label: "Recover failed rent ready",
      enabled: row.currentStage === "Failed Rent Ready",
      days: row.currentStage === "Failed Rent Ready" ? 3 : 0,
      category: "workflow",
    },
  ];
}

function buildSimulation(row, selectedOptions) {
  const simulatorOptions = getSimulatorOptions(row);

  const rawDaysRecovered = simulatorOptions
    .filter((option) => selectedOptions.includes(option.id) && option.enabled)
    .reduce((sum, option) => sum + option.days, 0);

  const cappedDaysRecovered = Math.min(
    Math.max(0, rawDaysRecovered),
    Math.max(0, row.impact?.daysRecovered || 0) + 2
  );

  const simulatedCompletion =
    cappedDaysRecovered > 0
      ? shiftDate(row.projectedCompletion, -cappedDaysRecovered)
      : row.projectedCompletion;

  const simulatedRevenueProtected =
    cappedDaysRecovered > 0
      ? cappedDaysRecovered * (row.impact?.dailyRentValue || 0)
      : 0;

  return {
    daysRecovered: cappedDaysRecovered,
    simulatedCompletion,
    revenueProtected: Math.round(simulatedRevenueProtected),
  };
}

function getRecommendedOptions(row) {
  const options = getSimulatorOptions(row).filter((option) => option.enabled);

  const ranked = [...options].sort((a, b) => {
    const categoryWeight = (category) => (category === "vendor" ? 1 : 0);
    return b.days - a.days || categoryWeight(b.category) - categoryWeight(a.category);
  });

  const selected = [];
  let totalDays = 0;
  const maxDays = Math.max(1, (row.impact?.daysRecovered || 0) + 2);

  for (const option of ranked) {
    if (selected.includes(option.id)) continue;
    if (totalDays >= maxDays) break;

    selected.push(option.id);
    totalDays += option.days || 0;
  }

  return selected;
}

function getTimelineRows(row) {
  const items = [
    {
      id: "projected_completion",
      label: "Projected completion",
      value: formatShortDate(row.projectedCompletion),
      tone: "slate",
    },
    {
      id: "current_stage",
      label: "Current stage",
      value: row.currentStage,
      tone: "slate",
    },
    {
      id: "days_in_stage",
      label: "Days in stage",
      value: `${row.daysInStage || 0}d`,
      tone: (row.daysInStage || 0) > (row.stageSla || 0) ? "red" : "green",
    },
    {
      id: "sla",
      label: "Stage SLA",
      value: `${row.stageSla || 0}d`,
      tone: "slate",
    },
  ];

  if (row.lastAction?.timestamp) {
    items.unshift({
      id: "last_action",
      label: row.lastAction.label || "Last action",
      value: formatShortDate(row.lastAction.timestamp),
      tone: row.lastAction.daysRecovered > 0 ? "green" : "slate",
      subtext:
        row.lastAction.daysRecovered > 0
          ? `${row.lastAction.daysRecovered}d saved • $${(
              row.lastAction.revenueProtected || 0
            ).toLocaleString()} protected`
          : "Tracked activity",
    });
  }

  return items;
}

function getWorkflowHistory(row) {
  const completed = Array.isArray(row.workflowCompletedSteps)
    ? row.workflowCompletedSteps
    : [];

  const labels = {
    rework: "Cleared rework items",
    inspect: "Re-inspected home",
    certify: "Confirmed rent ready",
    escalate_approval: "Escalated owner approval",
    confirm_scope: "Confirmed scope signoff",
    dispatch_vendor: "Dispatched vendor",
    identify_owner: "Identified blocker owner",
    remove_blocker: "Removed blocker",
    resume_execution: "Resumed execution",
    confirm_eta: "Confirmed appliance ETA",
    resequence_vendors: "Re-sequenced vendors",
    hold_ecd: "Held ECD",
    confirm_owner: "Confirmed owner",
    advance_action: "Advanced next action",
    ready_execution: "Ready for execution",
  };

  return completed.map((id) => ({
    id,
    label: labels[id] || id,
  }));
}

function getSyncTone(status) {
  if (status === "Delayed") return "amber";
  if (status === "Disconnected") return "red";
  return "green";
}

export default function TurnDetailDrawer({
  row,
  onClose,
  onResolve,
  onMarkReady,
  onApplyAction,
  onApplySimulatedPlan,
}) {
  const [selectedOptions, setSelectedOptions] = useState([]);

const recommendedOptions = useMemo(() => {
  if (!row) return [];
  return getRecommendedOptions(row);
}, [row]);

useEffect(() => {
  if (!row) {
    setSelectedOptions([]);
    return;
  }

  setSelectedOptions(recommendedOptions);
}, [row?.id, recommendedOptions]);

// --- CORE COMPUTATION ---

const simulation = useMemo(() => {
  if (!row) {
    return {
      daysRecovered: 0,
      simulatedCompletion: null,
      revenueProtected: 0,
    };
  }

  return buildSimulation(row, selectedOptions);
}, [row, selectedOptions]);

// --- OPTION SETS ---

const simulatorOptions = useMemo(() => {
  if (!row) return [];
  return getSimulatorOptions(row);
}, [row]);

// --- DERIVED STATE ---

const isRecommendedPlan =
  selectedOptions.length === recommendedOptions.length &&
  selectedOptions.every((opt) => recommendedOptions.includes(opt));

// --- SUPPORTING DATA ---

const timelineRows = useMemo(() => {
  if (!row) return [];
  return getTimelineRows(row);
}, [row]);

const workflowHistory = useMemo(() => {
  if (!row) return [];
  return getWorkflowHistory(row);
}, [row]);

const recentNotes = useMemo(() => {
  if (!row) return [];
  return Array.isArray(row.operationalNotes)
    ? [...row.operationalNotes].slice(-5).reverse()
    : [];
}, [row]);

const vendorSignal = useMemo(() => {
  if (!row) return null;
  return getVendorSignal(row);
}, [row]);

if (!row) return null;

  function toggleOption(optionId) {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  }

    function applySimulatedPlan() {
    if (!selectedOptions.length || simulation.daysRecovered <= 0) return;

    onApplySimulatedPlan({
      row,
      selectedOptions,
      simulation,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <div className="w-[720px] overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-slate-900">{row.name}</div>
            <div className="mt-1 text-sm text-slate-500">
              {row.market} • {row.portfolioName || "Portfolio not set"}
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill tone={row.priority.tone}>{row.priority.label}</Pill>
          <Pill tone="slate">{row.currentStage}</Pill>
          <Pill tone={row.turnStatus === "Blocked" ? "red" : "green"}>
            {row.turnStatus}
          </Pill>
          <Pill tone="blue">Risk {row.risk}</Pill>
        </div>

        <Card className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900">
                System of Record Sync
              </div>
              <div className="mt-1 text-xs text-slate-500">
                PMS-agnostic sync posture and source-system coverage
              </div>
            </div>
            <Pill tone={getSyncTone(row.syncStatus)}>{row.syncStatus}</Pill>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Source System</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.sourceSystemName}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Last Synced</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.lastSyncedAt ? formatShortDate(row.lastSyncedAt) : "—"}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {row.lastSyncedLabel || "No sync metadata"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Field Coverage</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.fieldCoverageLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Record ID</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.externalRecordId || row.id}
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <div className="text-xs uppercase tracking-wide text-slate-500">Why Now</div>
            <div className="mt-2 text-sm leading-6 text-slate-700">{row.priority.whyNow}</div>
          </Card>

          <Card>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Recovery Signal
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              +{row.impact.daysRecovered}d
            </div>
            <div className="mt-1 text-sm text-slate-500">
              ${row.impact.revenueRecovered.toLocaleString()} protectable
            </div>
          </Card>
        </div>

        <Card className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900">Execution Summary</div>
              <div className="mt-1 text-xs text-slate-500">
                Current operating context for this turn
              </div>
            </div>
            <Pill tone="slate">{row.turnOwner || "Unassigned"}</Pill>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Next Action</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{row.nextAction}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Blocker</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{row.blocker}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Assigned Vendor</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.vendor || "Unassigned"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Projected Completion</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {formatShortDate(row.projectedCompletion)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">Key Dates & Financials</div>
          <div className="mt-1 text-xs text-slate-500">
            Useful source-of-record fields surfaced for operating review
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Move-Out Date</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.moveOutDate ? formatShortDate(row.moveOutDate) : "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Initial ECD</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.initialProjectedCompletion
                  ? formatShortDate(row.initialProjectedCompletion)
                  : "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Current ECD</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {formatShortDate(row.projectedCompletion)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Estimate Amount</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                ${Number(row.estimatedAmount || 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Approved Amount</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                ${Number(row.approvedAmount || 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Daily Rent</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                ${row.impact.dailyRentValue}
              </div>
              <div className="mt-1 text-xs text-slate-400">{row.rentSourceLabel}</div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">Operational Coverage</div>
          <div className="mt-1 text-xs text-slate-500">
            Linked source-system objects and detected record coverage
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Work Orders</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {row.workOrderCount || 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {row.workOrderCount > 0 ? "Detected from source system" : "No linked work orders"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Approvals</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {row.approvalCount || 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {row.approvalCount > 0 ? "Approval trail present" : "No approval records linked"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Attachments</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                {row.attachmentCount || 0}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {row.attachmentCount > 0 ? "Attachments detected" : "No linked attachments"}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {(row.workOrders || []).slice(0, 3).map((workOrder) => (
              <div
                key={workOrder.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{workOrder.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {workOrder.trade} • {workOrder.vendor}
                    </div>
                  </div>
                  <Pill tone={workOrder.statusTone || "slate"}>{workOrder.status}</Pill>
                </div>
              </div>
            ))}

            {!row.workOrders?.length ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No detailed linked work orders surfaced yet.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">Timeline & Stage Health</div>
          <div className="mt-1 text-xs text-slate-500">
            Operational timing, milestones, and SLA position
          </div>

          <div className="mt-4 space-y-3">
            {timelineRows.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{item.label}</div>
                    {item.subtext ? (
                      <div className="mt-1 text-xs text-slate-500">{item.subtext}</div>
                    ) : null}
                  </div>
                  <Pill tone={item.tone}>{item.value}</Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">Workflow History</div>
          <div className="mt-1 text-xs text-slate-500">
            Completed execution steps and observed progress
          </div>

          {workflowHistory.length ? (
            <div className="mt-4 space-y-3">
              {workflowHistory.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                    ✓
                  </span>
                  <div className="text-sm text-slate-700">{item.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No workflow milestones completed yet.
            </div>
          )}
        </Card>

        <Card className="mt-6">
          <div className="text-sm font-medium text-slate-900">Recent Notes</div>
          <div className="mt-1 text-xs text-slate-500">
            Latest execution notes attached to this turn
          </div>

          {recentNotes.length ? (
            <div className="mt-4 space-y-3">
              {recentNotes.map((note, index) => (
                <div
                  key={`${index}-${note}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="text-sm text-slate-700">{note}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No notes logged yet for this turn.
            </div>
          )}
        </Card>

        <Card className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900">Vendor Intelligence</div>
              <div className="mt-1 text-xs text-slate-500">
                Dispatch and execution signal based on linked work orders and vendor posture
              </div>
            </div>
            <Pill
              tone={
                vendorSignal?.vendorRisk === "high"
                  ? "red"
                  : vendorSignal?.vendorRisk === "medium"
                  ? "amber"
                  : "green"
              }
            >
              {vendorSignal?.vendorRisk === "high"
                ? "High vendor risk"
                : vendorSignal?.vendorRisk === "medium"
                ? "Medium vendor risk"
                : "Stable vendor signal"}
            </Pill>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Assigned Vendor</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {vendorSignal?.vendorName}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Open Work Orders</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {vendorSignal?.openWorkOrders.length || 0}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Delayed Work Orders</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {vendorSignal?.delayedWorkOrders.length || 0}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {vendorSignal?.recommendation}
          </div>
        </Card>

        <Card className="mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900">Delay Simulator</div>
              <div className="mt-1 text-xs text-slate-500">
                Test likely recovery actions before applying the plan
              </div>
            </div>
            <Pill tone="blue">Scenario</Pill>
          </div>

                   <div className="mt-4 flex flex-wrap items-center gap-2">
  <Pill tone="green">AI-selected plan</Pill>
  <button
    onClick={() => setSelectedOptions(recommendedOptions)}
    className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
    Reapply recommendation
  </button>
</div>

<div className="mt-2 text-xs text-slate-500">
  Recommended plan selected based on blocker state, stage friction, vendor risk, and recoverable revenue.
</div>

          <div className="mt-4 space-y-3">
            {simulatorOptions.map((option) => (
              <label
                key={option.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-3 text-sm ${
                  option.enabled
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
  <input
    type="checkbox"
    checked={selectedOptions.includes(option.id)}
    disabled={!option.enabled}
    onChange={() => toggleOption(option.id)}
  />

  <div className="flex items-center gap-2">
    <span>{option.label}</span>

    {option.category && (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
        {option.category === "vendor" ? "Vendor" : "Workflow"}
      </span>
    )}
  </div>
</div>

                <div className="text-xs font-medium">
                  {option.enabled ? `+${option.days}d` : "N/A"}
                </div>
              </label>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Current ECD</div>
              <div className="mt-1 font-medium">{formatShortDate(row.projectedCompletion)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Simulated ECD</div>
              <div className="mt-1 font-medium">
                {formatShortDate(simulation.simulatedCompletion)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Simulated Days Recovered</div>
              <div className="mt-1 font-medium">{simulation.daysRecovered}d</div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Simulated Revenue Protected</div>
              <div className="mt-1 font-medium">
                ${simulation.revenueProtected.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            onClick={applySimulatedPlan}
            disabled={simulation.daysRecovered <= 0}
            className={`mt-4 w-full rounded-md px-3 py-2 text-sm font-medium ${
              simulation.daysRecovered > 0
                ? "bg-blue-600 text-white"
                : "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
            }`}
          >
            {isRecommendedPlan ? "Apply Recommended Plan" : "Apply Custom Plan"}
          </button>
        </Card>

        <div className="mt-6 grid gap-2 md:grid-cols-3">
          <button
            onClick={() => onResolve(row.id)}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          >
            Resolve
          </button>

          <button
            onClick={() => onMarkReady(row.id)}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            Mark Ready
          </button>

          <button
            onClick={() => onApplyAction(row)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
          >
            Apply Top Action
          </button>
        </div>
      </div>
    </div>
  );
}