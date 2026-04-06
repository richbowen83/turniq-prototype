function getPrimaryBlockerText(row) {
  const blockers = Array.isArray(row.blockers) ? row.blockers : [];
  const firstLive = blockers.find(
    (b) => b && b !== "No active blockers" && b !== "No major blockers"
  );

  return String(row.blocker || firstLive || "None");
}

function hasNoVendor(row) {
  return !row.vendor || row.vendor === "TBD" || row.vendor === "Unassigned";
}

export function getAiRiskDrivers(row) {
  const drivers = [];
  const blocker = getPrimaryBlockerText(row).toLowerCase();
  const daysInStage = row.daysInStage || 0;
  const stageSla = row.stageSla || 0;
  const risk = row.risk || 0;

  if (row.turnStatus === "Blocked") drivers.push("Blocked workflow");
  if (row.currentStage === "Failed Rent Ready") drivers.push("Failed rent ready");
  if (row.currentStage === "Owner Approval") drivers.push("Pending owner approval");

  if (stageSla > 0 && daysInStage > stageSla) {
    drivers.push(`${daysInStage - stageSla}d over SLA`);
  }

  if (risk >= 85) drivers.push("Very high risk score");
  else if (risk >= 75) drivers.push("High risk score");

  if (hasNoVendor(row)) drivers.push("No vendor assigned");
  if (blocker !== "none") drivers.push(getPrimaryBlockerText(row));
  if (row.stale) drivers.push("No recent movement");
  if ((row.daysToEcd ?? 999) < 3) drivers.push("ECD inside 3 days");

  return drivers.slice(0, 5);
}

export function getAiPriorityScore(row) {
  let score = 0;

  if (row.turnStatus === "Blocked") score += 35;
  if (row.currentStage === "Failed Rent Ready") score += 30;
  if (row.currentStage === "Owner Approval") score += 12;
  if (row.stale) score += 8;
  if (hasNoVendor(row)) score += 8;

  const daysOver = Math.max(0, (row.daysInStage || 0) - (row.stageSla || 0));
  score += Math.min(20, daysOver * 4);

  if ((row.daysToEcd ?? 999) < 0) score += 18;
  else if ((row.daysToEcd ?? 999) < 3) score += 10;

  score += Math.min(20, Math.round((row.risk || 0) / 5));

  return score;
}

export function getAiRecommendation(row) {
  const blocker = getPrimaryBlockerText(row).toLowerCase();
  const noVendor = hasNoVendor(row);
  const priorityScore = getAiPriorityScore(row);
  const dailyRentValue = row.dailyRentValue || row.impact?.dailyRentValue || 0;

  const makeRecommendation = ({
    action,
    title,
    reason,
    urgency,
    confidence,
    impactDays,
  }) => ({
    action,
    title,
    reason,
    urgency,
    confidence,
    impactDays,
    impactRevenue: Math.round((impactDays || 0) * dailyRentValue),
  });

  if (row.currentStage === "Failed Rent Ready") {
    return makeRecommendation({
      action: "recover_failed_ready",
      title: "Recover failed rent ready",
      reason: "Failed rent ready is the clearest source of direct delay and rework.",
      urgency: "High",
      confidence: 92,
      impactDays: 3,
    });
  }

  if (row.turnStatus === "Blocked") {
    return makeRecommendation({
      action: "resolve",
      title: "Resolve blocker",
      reason:
        blocker !== "none"
          ? `Blocked by ${blocker}.`
          : "Blocked workflow is the primary source of avoidable delay.",
      urgency: "High",
      confidence: 90,
      impactDays: 2,
    });
  }

  if (row.currentStage === "Owner Approval") {
    return makeRecommendation({
      action: "advance_approval",
      title: "Advance owner approval",
      reason: "Approval is the main unlock needed to push this turn into dispatch.",
      urgency: "High",
      confidence: 88,
      impactDays: 2,
    });
  }

  if (blocker.includes("appliance")) {
    return makeRecommendation({
      action: "progress",
      title: "Confirm appliance ETA and re-sequence work",
      reason: "Appliance dependency is likely to create avoidable idle time unless sequencing is adjusted.",
      urgency: "Medium",
      confidence: 82,
      impactDays: 1,
    });
  }

  if (noVendor) {
    return makeRecommendation({
      action: "pre_assign_vendor",
      title: "Assign best-fit vendor",
      reason: "No vendor is assigned and execution is exposed until coverage is in place.",
      urgency: "Medium",
      confidence: 86,
      impactDays: 2,
    });
  }

  if ((row.daysToEcd ?? 999) < 3) {
    return makeRecommendation({
      action: "progress",
      title: "Expedite execution",
      reason: "ECD is inside 3 days and the turn needs closer orchestration.",
      urgency: "Medium",
      confidence: 74,
      impactDays: 1,
    });
  }

  if ((row.daysInStage || 0) > (row.stageSla || 0)) {
    return makeRecommendation({
      action: "progress",
      title: "Re-sequence and progress",
      reason: "This turn is sitting beyond stage SLA and likely needs a push to recover time.",
      urgency: "Medium",
      confidence: 78,
      impactDays: Math.min(
        2,
        Math.max(1, (row.daysInStage || 0) - (row.stageSla || 0))
      ),
    });
  }

  return makeRecommendation({
    action: "monitor",
    title: "Monitor and progress",
    reason: "No critical intervention signal detected; continue standard execution.",
    urgency: priorityScore >= 30 ? "Medium" : "Low",
    confidence: 62,
    impactDays: 0,
  });
}