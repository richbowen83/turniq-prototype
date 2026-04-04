"use client";

import { useMemo, useState } from "react";
import TurnDetailDrawer from "../control-center/TurnDetailDrawer";
import {
  getDailyRentValue,
  getRentSourceLabel,
  shiftDate,
} from "../../utils/economics";
import PipelineFilters from "./PipelineFilters";
import PipelineTable from "./PipelineTable";

const NEXT_ACTION_OPTIONS = [
  "Prepare for dispatch",
  "Resolve blocker",
  "Recover failed rent ready",
  "Chase owner approval",
  "Confirm appliance ETA",
  "Confirm vendor schedule",
  "Pre-assign vendor",
  "Ready for execution",
];

function getMoveOutDate(row) {
  return row.moveOutDate || row.leaseEnd || null;
}

function getPrimaryBlocker(row) {
  const blockers = Array.isArray(row.blockers) ? row.blockers : [];
  const live = blockers.filter(
    (b) => b && b !== "No active blockers" && b !== "No major blockers"
  );
  return row.blocker || live[0] || "None";
}

function getStageSla(stage) {
  const map = {
    "Pre-Leasing": 3,
    "Pre-Move Out Inspection": 3,
    "Move Out Inspection": 2,
    "Scope Review": 3,
    "Owner Approval": 3,
    Dispatch: 2,
    "Pending RRI": 2,
    "Rent Ready Open": 1,
    "Failed Rent Ready": 0,
  };
  return map[stage] || 3;
}

function isUpcoming(row) {
  if (row.currentStage === "Failed Rent Ready") return false;
  if (row.turnStatus === "Ready") return false;

  const rawDate = getMoveOutDate(row);
  if (!rawDate) return false;

  const now = new Date();
  const target = new Date(rawDate);
  if (Number.isNaN(target.getTime())) return false;

  const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 21;
}

function getDaysUntil(dateValue) {
  if (!dateValue) return null;
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return null;
  return Math.ceil((dt.getTime() - Date.now()) / 86400000);
}

function suggestVendor(row) {
  if (row.market === "Phoenix") return "Desert Turn Co";
  if (row.market === "Dallas") return "Lone Star Repairs";
  if (row.market === "Atlanta") return "Peach State Services";
  if (row.market === "Nashville") return "Music City Maintenance";
  return "Preferred Vendor";
}

function getPriority(row, blocker, upcoming) {
  if (row.priority?.label && row.priority?.tone) return row.priority;

  const reasons = [];

  if (row.currentStage === "Failed Rent Ready") reasons.push("Failed rent ready");
  if (row.turnStatus === "Blocked") reasons.push("Blocked");
  if ((row.risk || 0) >= 75) reasons.push("High risk");
  if (upcoming) reasons.push("Upcoming");
  if (blocker && blocker !== "None") reasons.push(blocker);

  if (row.currentStage === "Failed Rent Ready" || row.turnStatus === "Blocked") {
    return {
      label: "Critical",
      tone: "red",
      score: row.risk || 80,
      whyNow: reasons.join(" + ") || "Immediate intervention required",
    };
  }

  if ((row.risk || 0) >= 75) {
    return {
      label: "High",
      tone: "amber",
      score: row.risk || 75,
      whyNow: reasons.join(" + ") || "High risk turn",
    };
  }

  return {
    label: "Low",
    tone: "green",
    score: row.risk || 0,
    whyNow: reasons.join(" + ") || "Routine monitoring",
  };
}

function getNextAction(row, blocker, upcoming) {
  if (row.nextAction) return row.nextAction;

  const blockerText = String(blocker || "").toLowerCase();

  if (upcoming && (!row.vendor || row.vendor === "TBD")) return "Pre-assign vendor";
  if (row.turnStatus === "Blocked") return "Resolve blocker";
  if (row.currentStage === "Failed Rent Ready") return "Recover failed rent ready";
  if (row.currentStage === "Owner Approval") return "Chase owner approval";
  if (blockerText.includes("appliance")) return "Confirm appliance ETA";
  if (blockerText.includes("vendor")) return "Confirm vendor schedule";
  if (blockerText.includes("access")) return "Resolve blocker";

  return "Prepare for dispatch";
}

function getUtilityIssueStatus(row, blocker) {
  if (row.utilityIssueStatus) return row.utilityIssueStatus;
  return String(blocker || "").toLowerCase().includes("utility") ? "Issue" : "Clear";
}

function getRriStatus(row) {
  if (row.rriStatus) return row.rriStatus;
  if (row.currentStage === "Failed Rent Ready") return "Failed";
  if (row.currentStage === "Pending RRI") return "Pending";
  if (row.currentStage === "Rent Ready Open") return "Open";
  if (row.turnStatus === "Ready") return "Passed";
  return "N/A";
}

function getAccessStatus(row, upcoming, blocker) {
  if (row.accessStatus) return row.accessStatus;
  const blockerText = String(blocker || "").toLowerCase();
  if (blockerText.includes("access") || blockerText.includes("lock")) return "Issue";
  if (upcoming) return "Needs setup";
  return "Ready";
}

function enrichPipelineRow(row) {
  const blocker = getPrimaryBlocker(row);
  const moveOutDate = getMoveOutDate(row);
  const upcoming = isUpcoming(row);
  const stageSla = getStageSla(row.currentStage);
  const daysInStage = row.daysInStage || 0;
  const overdue = stageSla > 0 && daysInStage > stageSla;
  const priority = getPriority(row, blocker, upcoming);

  return {
    ...row,
    blocker,
    moveOutDate,
    upcoming,
    dispatchDate:
      row.dispatchDate ||
      (row.currentStage === "Dispatch" ? row.projectedCompletion : null),
    upcomingMoveOut: upcoming ? "Yes" : "No",
    stageSla,
    overdue,
    daysToMoveOut: getDaysUntil(moveOutDate),
    daysToEcd: getDaysUntil(row.projectedCompletion),
    slaDelta: (row.daysInStage || 0) - stageSla,
    dailyRentValue: getDailyRentValue(row),
    rentSourceLabel: getRentSourceLabel(row),
    entityName: row.entityName || row.ownerEntity || "—",
    approvedAmount: row.approvedAmount ?? row.projectedCost ?? 0,
    estimatedAmount: row.estimatedAmount ?? row.projectedCost ?? 0,
    pmsLink:
      row.pmsLink ||
      row.systemLink ||
      `https://pms.example/turn/${encodeURIComponent(row.id)}`,
    priority,
    nextAction: getNextAction(row, blocker, upcoming),
    nextActionOptions: NEXT_ACTION_OPTIONS,
    assignedVendor: row.vendor && row.vendor !== "TBD" ? row.vendor : "",
    suggestedVendor: suggestVendor(row),
    utilityIssueStatus: getUtilityIssueStatus(row, blocker),
    rriStatus: getRriStatus(row),
    accessStatus: getAccessStatus(row, upcoming, blocker),
    impact: row.impact || {
      daysRecovered: overdue ? Math.min(3, daysInStage - stageSla) : 0,
      revenueRecovered: overdue
        ? Math.min(3, daysInStage - stageSla) * getDailyRentValue(row)
        : 0,
      dailyRentValue: getDailyRentValue(row),
    },
  };
}

export default function PipelineTab({
  rows,
  selectedPropertyId,
  setSelectedPropertyId,
  updateProperty,
}) {
  const [drawerRowId, setDrawerRowId] = useState(null);

  const pipelineRows = useMemo(() => rows.map(enrichPipelineRow), [rows]);

  const upcomingRows = useMemo(
    () => pipelineRows.filter((row) => row.upcoming),
    [pipelineRows]
  );

  const activeRows = useMemo(
    () => pipelineRows.filter((row) => !row.upcoming),
    [pipelineRows]
  );

  const drawerRow = useMemo(
    () => pipelineRows.find((row) => row.id === drawerRowId) || null,
    [pipelineRows, drawerRowId]
  );

  function patchRow(id, patch) {
    updateProperty?.(id, patch);
  }

  function openRow(row) {
    setSelectedPropertyId(row.id);
    setDrawerRowId(row.id);
  }

  function handleVendorChange(id, vendor) {
    patchRow(id, { vendor: vendor?.trim() ? vendor.trim() : "TBD" });
  }

  function handleNextActionChange(id, nextAction) {
    patchRow(id, { nextAction });
  }

  function handlePreAssignVendor(row) {
    patchRow(row.id, {
      vendor: row.assignedVendor || row.suggestedVendor,
      nextAction: "Confirm vendor schedule",
    });
  }

  function moveToUpcoming(id) {
    patchRow(id, {
      moveOutDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      turnStatus: "Monitoring",
    });
  }

  function moveOutOfUpcoming(id) {
    patchRow(id, {
      moveOutDate: new Date(Date.now() + 40 * 86400000).toISOString(),
    });
  }

  function handleResolve(id) {
    const row = pipelineRows.find((r) => r.id === id);
    if (!row) return;

    patchRow(id, {
      turnStatus: "Monitoring",
      blocker: "None",
      blockers: ["No active blockers"],
      nextAction: row.upcoming ? "Pre-assign vendor" : "Prepare for dispatch",
      daysInStage: Math.min(1, row.stageSla || 1),
    });
  }

  function handleMarkReady(id) {
    patchRow(id, {
      turnStatus: "Ready",
      daysInStage: 0,
      nextAction: "Ready for execution",
      rriStatus: "Passed",
    });
  }

  function handleApplyAction(row) {
    if (row.upcoming && (!row.vendor || row.vendor === "TBD")) {
      handlePreAssignVendor(row);
      return;
    }

    if (row.turnStatus === "Blocked") {
      handleResolve(row.id);
      return;
    }

    if (row.currentStage === "Failed Rent Ready") {
      patchRow(row.id, {
        currentStage: "Rent Ready Open",
        turnStatus: "Monitoring",
        blocker: "None",
        blockers: ["No active blockers"],
        daysInStage: 1,
        nextAction: "Recover failed rent ready",
        rriStatus: "Open",
      });
      return;
    }

    if (row.currentStage === "Owner Approval") {
      patchRow(row.id, {
        currentStage: "Dispatch",
        dispatchDate: new Date().toISOString(),
        turnStatus: "Monitoring",
        daysInStage: 0,
        nextAction: "Confirm vendor schedule",
      });
      return;
    }

    const nextDaysInStage = Math.max(0, (row.daysInStage || 0) - 1);
    const nextProjectedCompletion =
      row.projectedCompletion && (row.daysInStage || 0) > 0
        ? shiftDate(row.projectedCompletion, -1)
        : row.projectedCompletion;

    patchRow(row.id, {
      daysInStage: nextDaysInStage,
      projectedCompletion: nextProjectedCompletion,
      nextAction: "Prepare for dispatch",
    });
  }

  function handleApplySimulatedPlan({ row, simulation }) {
    if (!simulation || simulation.daysRecovered <= 0) return;

    const nextDaysInStage = Math.max(
      0,
      (row.daysInStage || 0) - simulation.daysRecovered
    );

    patchRow(row.id, {
      daysInStage: nextDaysInStage,
      projectedCompletion: simulation.simulatedCompletion,
      nextAction: "Execution adjusted via simulation",
    });
  }

  return (
    <div className="space-y-6">
      <PipelineFilters
        upcomingCount={upcomingRows.length}
        upcomingUnassignedCount={
          upcomingRows.filter((row) => !row.vendor || row.vendor === "TBD").length
        }
        blockedUpcomingCount={
          upcomingRows.filter((row) => row.turnStatus === "Blocked").length
        }
        activeCount={activeRows.length}
        selectedHint="Click any blue address to open the full turn drawer and act from there."
      />

      <PipelineTable
        title="Upcoming Turns"
        subtitle="Planning lane: turns with a Move Out Date inside the next 21 days, not Ready, and not Failed Rent Ready."
        rows={upcomingRows}
        selectedPropertyId={selectedPropertyId}
        openRow={openRow}
        onPreAssignVendor={handlePreAssignVendor}
        onVendorChange={handleVendorChange}
        onNextActionChange={handleNextActionChange}
        updateProperty={updateProperty}
        moveOutOfUpcoming={moveOutOfUpcoming}
        variant="upcoming"
      />

      <PipelineTable
        title="Active Turns"
        subtitle="Execution lane: all remaining in-flight turns outside the upcoming planning window."
        rows={activeRows}
        selectedPropertyId={selectedPropertyId}
        openRow={openRow}
        onVendorChange={handleVendorChange}
        onNextActionChange={handleNextActionChange}
        updateProperty={updateProperty}
        moveToUpcoming={moveToUpcoming}
        variant="active"
      />

      <TurnDetailDrawer
        row={drawerRow}
        onClose={() => setDrawerRowId(null)}
        onResolve={handleResolve}
        onMarkReady={handleMarkReady}
        onApplyAction={handleApplyAction}
        onApplySimulatedPlan={handleApplySimulatedPlan}
      />
    </div>
  );
}