export function buildImpactEngine({
  actionLearningLog = [],
  forecastRows = [],
  health = {},
  aiImpactSummary = {},
}) {
  const actionsCompleted =
    aiImpactSummary.actionsCompleted ?? actionLearningLog.length ?? 0;

  const turnsRecovered =
    aiImpactSummary.turnsRecovered ??
    new Set(actionLearningLog.map((entry) => entry.propertyId)).size;

  const totalDaysRecovered =
    aiImpactSummary.totalDaysRecovered ??
    actionLearningLog.reduce((sum, entry) => sum + (entry.daysSaved || 0), 0);

  const totalRevenueProtected =
    aiImpactSummary.totalRevenueProtected ??
    actionLearningLog.reduce((sum, entry) => sum + (entry.revenueProtected || 0), 0);

  const forecastBefore = forecastRows.length + actionsCompleted;
  const forecastAfter = forecastRows.length;

  const healthAfter = health.score || 0;
  const healthBefore = Math.max(0, healthAfter - Math.max(0, health.delta || 0));

  const latestAction = actionLearningLog[0] || null;

  const latestImpact = latestAction
    ? {
        label: `${latestAction.propertyName || "Latest turn"} improved by ${
          latestAction.daysSaved || 0
        }d`,
        action: latestAction.actionLabel || "Recommendation applied",
        revenueProtected: latestAction.revenueProtected || 0,
      }
    : null;

  const summary = {
    totalDaysRecovered,
    totalRevenueProtected,
    actionsCompleted,
    turnsRecovered,
    forecastBefore,
    forecastAfter,
    healthBefore,
    healthAfter,
  };

  const narration =
    actionsCompleted > 0
      ? `TurnIQ completed ${actionsCompleted} AI recommendation${
          actionsCompleted === 1 ? "" : "s"
        }, recovering ${totalDaysRecovered} vacancy days and protecting $${totalRevenueProtected.toLocaleString()} in revenue.`
      : "TurnIQ is monitoring the portfolio and waiting for the next completed recommendation.";

  return {
    summary,
    latestImpact,
    latestAction,
    narration,
  };
}