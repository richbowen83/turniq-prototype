export function getRiskTone(risk) {
  if (typeof risk !== "number") return "slate";

  if (risk >= 75) return "red";
  if (risk >= 60) return "amber";
  if (risk >= 40) return "green";

  return "slate";
}

export function getSeverityTone(level) {
  if (!level) return "slate";

  const normalized = String(level).toLowerCase();

  if (normalized === "high") return "red";
  if (normalized === "moderate") return "amber";
  if (normalized === "low") return "green";

  return "slate";
}

export function getStageTone(overdueCount, avgDays, sla) {
  const hasOverdue = (overdueCount || 0) > 0;
  const avg = avgDays || 0;
  const threshold = sla || 0;

  if (hasOverdue) return "red";
  if (threshold > 0 && avg > threshold) return "amber";
  if (avg > 0) return "green";

  return "slate";
}

export function getActionTone(type) {
  // Normalize action tone into supported UI tones
  if (type === "primary") return "red";      // high urgency / action
  if (type === "secondary") return "slate";  // neutral action

  return "slate";
}