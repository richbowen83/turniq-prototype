"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { formatShortDate, shiftDate } from "../../utils/economics";

const VENDOR_SCORECARD = {
  FloorCo: {
    markets: ["Dallas"],
    trades: ["Flooring", "Paint", "General", "Flooring + Paint"],
    quality: 92,
    speed: 88,
    reliability: 91,
    cost: 74,
  },
  "ABC Paint": {
    markets: ["Atlanta"],
    trades: ["Paint", "Patch", "Paint + Patch", "General"],
    quality: 90,
    speed: 89,
    reliability: 88,
    cost: 81,
  },
  Sparkle: {
    markets: ["Dallas", "Nashville"],
    trades: ["Deep Clean", "Cleaning", "General"],
    quality: 87,
    speed: 95,
    reliability: 93,
    cost: 85,
  },
  CoolAir: {
    markets: ["Phoenix"],
    trades: ["HVAC", "General", "Heavy Turn Review"],
    quality: 84,
    speed: 76,
    reliability: 82,
    cost: 70,
  },
  "Prime Paint": {
    markets: ["Phoenix"],
    trades: ["Paint", "Flooring", "Paint + Flooring", "General"],
    quality: 86,
    speed: 84,
    reliability: 85,
    cost: 75,
  },
  "Desert Turn Co": {
    markets: ["Phoenix"],
    trades: ["General", "Paint", "Flooring", "Heavy Turn Review"],
    quality: 89,
    speed: 87,
    reliability: 88,
    cost: 73,
  },
  "Lone Star Repairs": {
    markets: ["Dallas"],
    trades: ["General", "Flooring + Paint", "Paint", "Flooring"],
    quality: 88,
    speed: 86,
    reliability: 87,
    cost: 76,
  },
  "Peach State Services": {
    markets: ["Atlanta"],
    trades: ["General", "Paint + Patch", "Paint"],
    quality: 85,
    speed: 83,
    reliability: 84,
    cost: 80,
  },
  "Music City Maintenance": {
    markets: ["Nashville"],
    trades: ["General", "Deep Clean", "Paint"],
    quality: 84,
    speed: 82,
    reliability: 85,
    cost: 79,
  },
};

function getEstimateAmount(row) {
  return (
    row?.estimated_cost ??
    row?.estimatedCost ??
    row?.estimateCost ??
    row?.estimatedAmount ??
    row?.projected_cost ??
    row?.projectedCost ??
    0
  );
}

function getApprovedAmount(row) {
  return (
    row?.approved_cost ??
    row?.approvedCost ??
    row?.approvedAmount ??
    0
  );
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString()}`;
}

function getVendorOverall(score) {
  return Math.round(
    score.quality * 0.35 +
      score.speed * 0.3 +
      score.reliability * 0.2 +
      score.cost * 0.15
  );
}

function getVendorSignal(row) {
  const vendorName = row.vendor || "Unassigned";
  const workOrders = Array.isArray(row.workOrders) ? row.workOrders : [];

  const delayedWorkOrders = workOrders.filter((workOrder) =>
    ["Delayed", "Overdue", "Blocked"].includes(workOrder.status)
  );

  const openWorkOrders = workOrders.filter(
    (workOrder) => !["Completed", "Closed"].includes(workOrder.status)
  );

  const missingVendor =
    !row.vendor || row.vendor === "TBD" || row.vendor === "Unassigned";

  const vendorRisk = missingVendor
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
    recommendation: missingVendor
      ? "Assign a vendor to unlock execution"
      : vendorRisk === "high"
      ? `Current vendor (${vendorName}) is creating delay risk`
      : vendorRisk === "medium"
      ? `Monitor ${vendorName} closely`
      : `${vendorName} looks stable`,
  };
}

function matchesTrade(vendorTrades, scope) {
  if (!scope) return vendorTrades.includes("General");
  return (
    vendorTrades.includes(scope) ||
    vendorTrades.includes("General") ||
    vendorTrades.some((trade) =>
      String(scope).toLowerCase().includes(String(trade).toLowerCase())
    )
  );
}

function getRecommendedVendor(row) {
  const candidates = Object.entries(VENDOR_SCORECARD)
    .map(([vendor, score]) => ({
      vendor,
      ...score,
      overall: getVendorOverall(score),
    }))
    .filter(
      (candidate) =>
        candidate.markets.includes(row.market) &&
        matchesTrade(candidate.trades, row.scope)
    )
    .sort((a, b) => b.overall - a.overall);

  if (!candidates.length) return null;

  const best = candidates[0];
  const currentVendorScore = row.vendor ? VENDOR_SCORECARD[row.vendor] : null;
  const currentOverall = currentVendorScore
    ? getVendorOverall(currentVendorScore)
    : null;

  const scoreDelta =
    currentOverall != null ? best.overall - currentOverall : best.overall;

  const reason =
    !row.vendor || row.vendor === "TBD" || row.vendor === "Unassigned"
      ? `Best available fit for ${row.market} with stronger speed and quality for this scope.`
      : scoreDelta > 0
      ? `${best.vendor} scores ${scoreDelta} points above ${row.vendor} for this market/scope combination.`
      : `${best.vendor} is the strongest available option for this turn.`;

  return {
    ...best,
    currentOverall,
    scoreDelta,
    reason,
    estimatedDaysSaved:
      !row.vendor || row.vendor === "TBD" || row.vendor === "Unassigned"
        ? 2
        : scoreDelta >= 8
        ? 2
        : scoreDelta >= 3
        ? 1
        : 0,
  };
}

function getSimulatorOptions(row, recommendedVendor) {
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
          ? Math.min(
              2,
              Math.max(1, (row.daysInStage || 0) - (row.stageSla || 0))
            )
          : 0,
      category: "vendor",
    },
    {
      id: "switch_vendor",
      label: recommendedVendor
        ? `Switch to ${recommendedVendor.vendor}`
        : vendorSignal.missingVendor
        ? "Assign best-fit vendor"
        : "Switch vendor",
      enabled:
        Boolean(recommendedVendor) &&
        (vendorSignal.missingVendor ||
          vendorSignal.vendorRisk !== "low" ||
          recommendedVendor.vendor !== row.vendor),
      days: recommendedVendor?.estimatedDaysSaved || 0,
      category: "vendor",
    },
    {
      id: "expedite_vendor",
      label: vendorSignal.missingVendor
        ? "Escalate vendor assignment"
        : "Expedite current vendor",
      enabled: vendorSignal.vendorRisk === "high" || vendorSignal.missingVendor,
      days:
        vendorSignal.vendorRisk === "high" || vendorSignal.missingVendor ? 1 : 0,
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

function buildSimulation(row, selectedOptions, simulatorOptions) {
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

function getRecommendedOptions(row, simulatorOptions) {
  const options = simulatorOptions.filter((option) => option.enabled);

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

function getUrgencyTone(urgency) {
  if (urgency === "High") return "red";
  if (urgency === "Medium") return "amber";
  return "slate";
}

function getReadinessTone(value) {
  const text = String(value || "").toLowerCase();
  if (
    text.includes("issue") ||
    text.includes("failed") ||
    text.includes("blocked") ||
    text.includes("delay")
  ) {
    return "red";
  }
  if (
    text.includes("needs") ||
    text.includes("pending") ||
    text.includes("notice") ||
    text.includes("setup")
  ) {
    return "amber";
  }
  if (
    text.includes("clear") ||
    text.includes("ready") ||
    text.includes("passed") ||
    text.includes("vacant")
  ) {
    return "green";
  }
  return "slate";
}

function getOccupancyStatus(row) {
  return (
    row.currentOccupancyStatus ||
    row.occupancyStatus ||
    row.occupancy ||
    row.currentOccupancy ||
    "Unknown"
  );
}

function getMaterialsStatus(row) {
  if (row.materialsStatus) return row.materialsStatus;
  if (row.applianceStatus) return row.applianceStatus;

  const blockerText = String(row.blocker || "").toLowerCase();
  if (blockerText.includes("appliance")) return "Delayed";
  if (blockerText.includes("material")) return "Issue";

  return "Clear";
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

  const recommendedVendor = useMemo(() => {
    if (!row) return null;
    return getRecommendedVendor(row);
  }, [row]);

  const simulatorOptions = useMemo(() => {
    if (!row) return [];
    return getSimulatorOptions(row, recommendedVendor);
  }, [row, recommendedVendor]);

  const recommendedOptions = useMemo(() => {
    if (!row) return [];
    return getRecommendedOptions(row, simulatorOptions);
  }, [row, simulatorOptions]);

  useEffect(() => {
    if (!row) {
      setSelectedOptions([]);
      return;
    }
    setSelectedOptions(recommendedOptions);
  }, [row?.id, recommendedOptions]);

  const simulation = useMemo(() => {
    if (!row) {
      return {
        daysRecovered: 0,
        simulatedCompletion: null,
        revenueProtected: 0,
      };
    }
    return buildSimulation(row, selectedOptions, simulatorOptions);
  }, [row, selectedOptions, simulatorOptions]);

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

  const estimateAmount = getEstimateAmount(row);
  const approvedAmount = getApprovedAmount(row);
  const projectedAmount =
    approvedAmount > 0 ? approvedAmount : estimateAmount;

  const aiRecommendation = row.aiRecommendation || null;
  const aiRiskDrivers = Array.isArray(row.aiRiskDrivers) ? row.aiRiskDrivers : [];
  const aiConfidence = aiRecommendation?.confidence || 0;
  const aiImpactDays = aiRecommendation?.impactDays ?? row.impact?.daysRecovered ?? 0;
  const aiImpactRevenue =
    aiRecommendation?.impactRevenue ?? row.impact?.revenueRecovered ?? 0;
  const aiUrgency = aiRecommendation?.urgency || "Review";

  const occupancyStatus = getOccupancyStatus(row);
  const utilityStatus = row.utilityIssueStatus || "Unknown";
  const accessStatus = row.accessStatus || "Unknown";
  const rriStatus = row.rriStatus || "N/A";
  const materialsStatus = getMaterialsStatus(row);

  const isRecommendedPlan =
    selectedOptions.length === recommendedOptions.length &&
    selectedOptions.every((opt) => recommendedOptions.includes(opt));

  function toggleOption(optionId) {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  }

  function applySimulatedPlan() {
    if (!selectedOptions.length || simulation.daysRecovered <= 0) return;

    const patch = {};

    if (selectedOptions.includes("switch_vendor") && recommendedVendor) {
      patch.vendor = recommendedVendor.vendor;
      patch.nextAction = "Confirm recommended vendor schedule";
    }

    onApplySimulatedPlan({
      row: { ...row, ...patch },
      selectedOptions,
      simulation,
    });
  }

  function applyRecommendedVendorNow() {
    if (!recommendedVendor) return;
    onApplySimulatedPlan({
      row: { ...row, vendor: recommendedVendor.vendor, nextAction: "Confirm recommended vendor schedule" },
      selectedOptions: ["switch_vendor"],
      simulation: {
        daysRecovered: recommendedVendor.estimatedDaysSaved || 0,
        simulatedCompletion:
          recommendedVendor.estimatedDaysSaved > 0
            ? shiftDate(row.projectedCompletion, -(recommendedVendor.estimatedDaysSaved || 0))
            : row.projectedCompletion,
        revenueProtected: Math.round(
          (recommendedVendor.estimatedDaysSaved || 0) * (row.impact?.dailyRentValue || 0)
        ),
      },
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
            <div className="mt-1 text-xs text-slate-500">
              Turn detail: context, readiness, and recovery options
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Pill tone={row.priority?.tone || "slate"}>
            {row.priority?.label || "Review"}
          </Pill>
          <Pill tone="slate">{row.currentStage}</Pill>
          <Pill tone={row.turnStatus === "Blocked" ? "red" : "green"}>
            {row.turnStatus}
          </Pill>
          <Pill tone="blue">Risk {row.risk}</Pill>
        </div>

        {/* DECIDE */}
        <Card className="mt-6 border-blue-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900">AI Recommendation</div>
              <div className="mt-1 text-xs text-slate-500">
                Modeled intervention based on blockage, stage friction, vendor signal, and recoverable value
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="blue">AI</Pill>
              <Pill tone={getUrgencyTone(aiUrgency)}>{aiUrgency}</Pill>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-base font-semibold text-slate-900">
              {aiRecommendation?.title || "Review turn"}
            </div>
            <div className="mt-2 text-sm text-slate-600">
              {aiRecommendation?.reason || row.priority?.whyNow || "No recommendation reason available."}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="slate">{aiConfidence}% confidence</Pill>
              <Pill tone="green">+{aiImpactDays}d</Pill>
              <Pill tone="green">${Number(aiImpactRevenue || 0).toLocaleString()}</Pill>
            </div>

            {aiRiskDrivers.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {aiRiskDrivers.map((driver) => (
                  <Pill key={driver} tone="amber">
                    {driver}
                  </Pill>
                ))}
              </div>
            ) : null}

            <div className="mt-4">
              <button
                onClick={() => onApplyAction(row)}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Apply recommendation
              </button>
            </div>
          </div>
        </Card>

        <Card className="mt-4 border-emerald-200 bg-emerald-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900">
                Recommended Vendor
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Best fit for this market and scope based on quality, speed, reliability, and cost
              </div>
            </div>
            <Pill tone="green">Auto recommendation</Pill>
          </div>

          {recommendedVendor ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    {recommendedVendor.vendor}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {recommendedVendor.reason}
                  </div>
                </div>
                <Pill tone="green">Score {recommendedVendor.overall}</Pill>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Pill tone="green">Quality {recommendedVendor.quality}</Pill>
                <Pill tone="green">Speed {recommendedVendor.speed}</Pill>
                <Pill tone="slate">Reliability {recommendedVendor.reliability}</Pill>
                <Pill tone="amber">Cost {recommendedVendor.cost}</Pill>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={applyRecommendedVendorNow}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Switch to recommended vendor
                </button>
                {row.vendor ? (
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Current vendor: {row.vendor}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              No strong recommendation available for this market / scope yet.
            </div>
          )}
        </Card>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <div className="text-xs uppercase tracking-wide text-slate-500">Why Now</div>
            <div className="mt-2 text-sm leading-6 text-slate-700">
              {row.priority?.whyNow || "No current urgency signal"}
            </div>
          </Card>

          <Card>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Recovery Signal
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              +{row.impact?.daysRecovered || 0}d
            </div>
            <div className="mt-1 text-sm text-slate-500">
              ${Number(row.impact?.revenueRecovered || 0).toLocaleString()} protectable
            </div>
          </Card>
        </div>

        {/* EXECUTE */}
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
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.nextAction}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Blocker</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.blocker}
              </div>
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

        <Card className="mt-4">
          <div className="text-sm font-medium text-slate-900">Operational Readiness</div>
          <div className="mt-1 text-xs text-slate-500">
            Readiness checks and execution dependencies
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Current Occupancy Status</div>
              <div className="mt-2">
                <Pill tone={getReadinessTone(occupancyStatus)}>{occupancyStatus}</Pill>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Utility Issue</div>
              <div className="mt-2">
                <Pill tone={getReadinessTone(utilityStatus)}>{utilityStatus}</Pill>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Access Status</div>
              <div className="mt-2">
                <Pill tone={getReadinessTone(accessStatus)}>{accessStatus}</Pill>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">RRI Status</div>
              <div className="mt-2">
                <Pill tone={getReadinessTone(rriStatus)}>{rriStatus}</Pill>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Materials / Appliance Status</div>
              <div className="mt-2">
                <Pill tone={getReadinessTone(materialsStatus)}>{materialsStatus}</Pill>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Move-Out Date</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {row.moveOutDate ? formatShortDate(row.moveOutDate) : "—"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-4">
          <div className="text-sm font-medium text-slate-900">Key Dates & Financials</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                {formatCurrency(estimateAmount)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Approved Amount</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {formatCurrency(approvedAmount)}
              </div>
            </div>

           <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Projected Amount</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {formatCurrency(projectedAmount)}
            </div>
         </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Daily Rent</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                ${row.impact?.dailyRentValue || 0}
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-4">
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

        {/* INSPECT */}
        <Card className="mt-4">
          <div className="text-sm font-medium text-slate-900">Vendor Intelligence</div>
          <div className="mt-1 text-xs text-slate-500">
            Dispatch and execution signal based on linked work orders and vendor posture
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

        <Card className="mt-4">
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
                    {option.category ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                        {option.category === "vendor" ? "Vendor" : "Workflow"}
                      </span>
                    ) : null}
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
              <div className="mt-1 font-medium">
                {formatShortDate(row.projectedCompletion)}
              </div>
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