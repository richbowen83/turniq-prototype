export function forecastTurn(row) {
  let score = 0;
  const drivers = [];

  if (row.turnStatus === "Blocked") {
    score += 35;
    drivers.push("Blocked");
  }

  if ((row.daysInStage || 0) > (row.stageSla || 0)) {
    score += 20;
    drivers.push("Stage SLA exceeded");
  }

  if (row.currentStage === "Owner Approval") {
    score += 18;
    drivers.push("Owner approval pending");
  }

  if (row.vendor === "Unassigned") {
    score += 15;
    drivers.push("Vendor not assigned");
  }

  if (row.currentStage === "Failed Rent Ready") {
    score += 25;
    drivers.push("Failed rent ready");
  }

  if ((row.risk || 0) >= 80) {
    score += 10;
    drivers.push("High operational risk");
  }

  const probability = Math.min(score, 99);

  return {
    probability,
    likelyToSlip: probability >= 60,
    drivers,
    confidence:
      probability >= 80
        ? "High"
        : probability >= 60
        ? "Medium"
        : "Low",
  };
}