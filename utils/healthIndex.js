export function calculateHealthIndex(input = []) {
  const rows = Array.isArray(input)
    ? input
    : Array.isArray(input?.turns)
    ? input.turns
    : Array.isArray(input?.rows)
    ? input.rows
    : [];

  const total = rows.length || 1;

  const blocked = rows.filter((r) => r.turnStatus === "Blocked").length;
  const overSla = rows.filter((r) => r.overdue).length;
  const forecastMisses = rows.filter(
    (r) => r.forecast?.likelyToSlip || r.ecdPrediction?.likelyToSlip
  ).length;
  const highRisk = rows.filter((r) => (r.risk || 0) >= 75).length;
  const vendorless = rows.filter((r) => !r.vendor || r.vendor === "TBD").length;
  const stale = rows.filter((r) => r.stale).length;

  const penalties = [
    {
      key: "blocked",
      label: `${blocked} blocked turns are creating execution drag`,
      icon: "🚧",
      tone: "red",
      value: blocked,
      penalty: (blocked / total) * 18,
    },
    {
      key: "overSla",
      label: `${overSla} turns are currently over SLA`,
      icon: "⏱️",
      tone: "amber",
      value: overSla,
      penalty: (overSla / total) * 16,
    },
    {
      key: "forecastMisses",
      label: `${forecastMisses} turns are forecasted to miss ECD`,
      icon: "🔮",
      tone: "red",
      value: forecastMisses,
      penalty: (forecastMisses / total) * 22,
    },
    {
      key: "highRisk",
      label: `${highRisk} turns are in high-risk status`,
      icon: "🔥",
      tone: "amber",
      value: highRisk,
      penalty: (highRisk / total) * 18,
    },
    {
      key: "vendorless",
      label: `${vendorless} turns have no assigned vendor`,
      icon: "🚚",
      tone: "blue",
      value: vendorless,
      penalty: (vendorless / total) * 12,
    },
    {
      key: "stale",
      label: `${stale} stale turns have had limited recent movement`,
      icon: "🧊",
      tone: "slate",
      value: stale,
      penalty: (stale / total) * 14,
    },
  ];

  const totalPenalty = penalties.reduce((sum, item) => sum + item.penalty, 0);

  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));

  const status =
    score >= 80
      ? "Healthy"
      : score >= 65
      ? "Stable"
      : score >= 50
      ? "At Risk"
      : "Critical";

  const drivers = penalties
    .filter((item) => item.value > 0)
    .sort((a, b) => b.penalty - a.penalty);

  const topDriver = drivers[0] || {
    key: "healthy",
    label: "No major health drag detected",
    icon: "✅",
    tone: "green",
    value: 0,
    penalty: 0,
  };

  const interpretation =
    status === "Healthy"
      ? "Portfolio health is strong with limited execution drag."
      : status === "Stable"
      ? "Portfolio health is stable, but blocked work and forecast risk are reducing confidence."
      : status === "At Risk"
      ? "Portfolio health needs intervention; execution drag is concentrated in the highest-risk turns."
      : "Portfolio health is critical and requires immediate leadership intervention.";

  return {
    score,
    delta: 0,
    status,
    interpretation,
    topDriver,
    drivers,
  };
}