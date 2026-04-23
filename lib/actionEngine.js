export function getRecommendedAction(turn, vendorRows = []) {
  // 1. Vendor missing
  if (!turn.vendor || turn.vendor === "TBD") {
    const bestVendor = vendorRows
      .filter((v) => v.actionLabel === "Expand")
      .sort((a, b) => b.overall - a.overall)[0];

    if (bestVendor) {
      return {
        action: `Assign ${bestVendor.vendor}`,
        reason: "No vendor assigned",
        impact: "Reduces delay risk by ~2 days",
        priority: "High",
      };
    }

    return {
      action: "Assign vendor",
      reason: "Turn is unassigned",
      impact: "Unblocks execution",
      priority: "High",
    };
  }

  // 2. Approval delay
  if (turn.approval_status === "Pending") {
    return {
      action: "Follow up on owner approval",
      reason: "Approval blocking progression",
      impact: "Enables dispatch",
      priority: "High",
    };
  }

  // 3. Access issue
  if (turn.access_days_since >= 7) {
    return {
      action: "Confirm vendor access",
      reason: "No recent lockbox activity",
      impact: "Prevents idle time",
      priority: "Medium",
    };
  }

  // 4. RRI/MOI issues
  if (turn.rri_state && turn.rri_state !== "Complete") {
    return {
      action: "Resolve RRI",
      reason: "Inspection incomplete",
      impact: "Unlocks rent ready",
      priority: "High",
    };
  }

  // 5. Default
  return {
    action: "Monitor",
    reason: "No critical blockers",
    impact: "On track",
    priority: "Low",
  };
}