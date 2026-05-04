export function enrichTurnWithIntelligence(turn) {
  const riskDrivers = [];
  let riskScore = 35;

  const daysOpen = Number(turn.openDays || turn["Days Open"] || 0);
  const daysInStage = Number(turn.daysInStage || turn["Current Days in Stage"] || 0);
  const stage = turn.currentStage || turn["Turn Stage"] || "";
  const status = turn.turnStatus || turn["Turn Status"] || "";

  if (daysOpen > 30) {
    riskScore += 25;
    riskDrivers.push("Turn has been open more than 30 days.");
  }

  if (daysInStage > 5) {
    riskScore += 20;
    riskDrivers.push("Turn is aging in current stage.");
  }

  if (String(status).toLowerCase().includes("blocked")) {
    riskScore += 25;
    riskDrivers.push("Turn is currently blocked.");
  }

  if (String(stage).toLowerCase().includes("owner")) {
    riskScore += 15;
    riskDrivers.push("Owner approval is creating execution risk.");
  }

  if (String(stage).toLowerCase().includes("failed")) {
    riskScore += 20;
    riskDrivers.push("Failed rent-ready status indicates rework risk.");
  }

  riskScore = Math.min(100, riskScore);

  const nextBestAction =
    riskScore >= 80
      ? "Escalate today and assign an owner to clear the blocker."
      : riskScore >= 65
      ? "Review stage aging and confirm vendor / approval next step."
      : "Monitor; no immediate escalation required.";

  const readinessScore = Math.max(0, 100 - riskScore + 15);

  return {
    ...turn,
    risk: riskScore,
    readiness: readinessScore,
    riskDrivers,
    nextBestAction,
    aiSummary: `${riskScore >= 75 ? "High-risk" : riskScore >= 60 ? "Watchlist" : "Healthy"} turn. ${nextBestAction}`,
  };
}