import { shiftDate } from "./economics";
import { getAiRecommendation } from "./turnAi";

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

function suggestVendor(row) {
  if (row.market === "Phoenix") return "Desert Turn Co";
  if (row.market === "Dallas") return "Lone Star Repairs";
  if (row.market === "Atlanta") return "Peach State Services";
  if (row.market === "Nashville") return "Music City Maintenance";
  return "Preferred Vendor";
}

function appendCompletedStep(row, stepId) {
  const existing = Array.isArray(row.workflowCompletedSteps)
    ? row.workflowCompletedSteps
    : [];
  return existing.includes(stepId) ? existing : [...existing, stepId];
}

function appendCompletedSteps(row, stepIds) {
  return stepIds.reduce(
    (acc, stepId) => (acc.includes(stepId) ? acc : [...acc, stepId]),
    Array.isArray(row.workflowCompletedSteps) ? row.workflowCompletedSteps : []
  );
}

export function buildPatchForResolve(row) {
  const targetDays = Math.min(1, getStageSla(row.currentStage));
  const daysSaved = Math.max(0, (row.daysInStage || 0) - targetDays);

  return {
    turnStatus: "Monitoring",
    blockers: ["No active blockers"],
    blocker: "None",
    nextAction: "Prepare for dispatch",
    daysInStage: targetDays,
    projectedCompletion:
      daysSaved > 0
        ? shiftDate(row.projectedCompletion, -daysSaved)
        : row.projectedCompletion,
    workflowCompletedSteps: appendCompletedStep(row, "remove_blocker"),
  };
}

export function buildPatchForMarkReady(row) {
  const daysSaved = row.daysInStage || 0;

  return {
    turnStatus: "Ready",
    nextAction: "Ready for execution",
    daysInStage: 0,
    projectedCompletion:
      daysSaved > 0
        ? shiftDate(row.projectedCompletion, -daysSaved)
        : row.projectedCompletion,
    rriStatus: "Passed",
    workflowCompletedSteps: appendCompletedSteps(row, [
      "certify",
      "ready_execution",
      "hold_ecd",
    ]),
  };
}

export function buildPatchForPreAssignVendor(row) {
  const vendor =
    row.vendor && row.vendor !== "TBD" && row.vendor !== "Unassigned"
      ? row.vendor
      : row.suggestedVendor || suggestVendor(row);

  return {
    vendor,
    nextAction: "Confirm vendor schedule",
    workflowCompletedSteps: appendCompletedStep(row, "assign_vendor"),
  };
}

export function buildPatchForAdvanceApproval(row) {
  const daysSaved = row.daysInStage || 0;

  return {
    currentStage: "Dispatch",
    daysInStage: 0,
    nextAction: "Confirm vendor schedule",
    turnStatus: "Monitoring",
    blockers: ["No active blockers"],
    blocker: "None",
    projectedCompletion:
      daysSaved > 0
        ? shiftDate(row.projectedCompletion, -daysSaved)
        : row.projectedCompletion,
    workflowCompletedSteps: appendCompletedSteps(row, [
      "escalate_approval",
      "confirm_scope",
      "dispatch_vendor",
    ]),
  };
}

export function buildPatchForRecoverFailedReady(row) {
  const daysSaved = Math.max(0, (row.daysInStage || 0) - 1);

  return {
    currentStage: "Rent Ready Open",
    daysInStage: 1,
    turnStatus: "Monitoring",
    nextAction: "Re-inspect and confirm ready state",
    blockers: ["No active blockers"],
    blocker: "None",
    rriStatus: "Open",
    projectedCompletion:
      daysSaved > 0
        ? shiftDate(row.projectedCompletion, -daysSaved)
        : row.projectedCompletion,
    workflowCompletedSteps: appendCompletedSteps(row, [
      "rework",
      "inspect",
    ]),
  };
}

export function buildPatchForProgressStep(row) {
  const targetDays = Math.max(0, getStageSla(row.currentStage) - 1);
  const daysSaved = Math.max(0, (row.daysInStage || 0) - targetDays);

  return {
    daysInStage: targetDays,
    turnStatus: "Monitoring",
    nextAction: "Prepare for dispatch",
    projectedCompletion:
      daysSaved > 0
        ? shiftDate(row.projectedCompletion, -daysSaved)
        : row.projectedCompletion,
    workflowCompletedSteps: appendCompletedSteps(row, [
      "advance_action",
      "resume_execution",
    ]),
  };
}

export function buildPatchForMoveToUpcoming(row) {
  return {
    moveOutDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    turnStatus: row.turnStatus === "Ready" ? "Monitoring" : row.turnStatus,
  };
}

export function buildPatchForMoveOutOfUpcoming() {
  return {
    moveOutDate: new Date(Date.now() + 40 * 86400000).toISOString(),
  };
}

export function buildPatchForApplyRecommendation(row, aiRecommendation) {
  const recommendation = aiRecommendation || getAiRecommendation(row);
  const action = recommendation?.action;
  if (!action) return null;

  switch (action) {
    case "pre_assign_vendor":
      return buildPatchForPreAssignVendor(row);

    case "resolve":
      return buildPatchForResolve(row);

    case "recover_failed_ready":
      return buildPatchForRecoverFailedReady(row);

    case "advance_approval":
      return buildPatchForAdvanceApproval(row);

    case "progress":
      return buildPatchForProgressStep(row);

    case "monitor":
      return {
        nextAction: "Prepare for dispatch",
      };

    default:
      return null;
  }
}