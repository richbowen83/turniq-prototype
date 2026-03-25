export function getRiskTone(risk) {
  if (risk >= 75) return "red";
  if (risk >= 60) return "amber";
  return "green";
}

export function getSeverityTone(level) {
  if (level === "High") return "red";
  if (level === "Moderate") return "amber";
  return "green";
}

export function getStageTone(overdueCount, avgDays, sla) {
  if (overdueCount > 0) return "red";
  if (avgDays > sla) return "amber";
  return "green";
}

export function getActionTone(type) {
  if (type === "primary") return "primary";
  return "secondary";
}