import { NextResponse } from "next/server";
import { insertActionHistory } from "../../../lib/actionHistoryDb";

export async function POST(request) {
  try {
    const body = await request.json();

    const payload = {
      org_id: body.orgId || "demo",
      turn_id: body.turnId,

      property_name: body.propertyName,
      market: body.market,

      action_type: body.actionType,
      action_source: body.actionSource || "user",

      ai_recommendation: body.aiRecommendation,

      previous_stage: body.previousStage,
      new_stage: body.newStage,

      previous_status: body.previousStatus,
      new_status: body.newStatus,

      previous_risk: body.previousRisk,
      new_risk: body.newRisk,

      estimated_days_saved: body.estimatedDaysSaved || 0,
      estimated_revenue_protected:
        body.estimatedRevenueProtected || 0,

      actor_name: body.actorName || "Operator",

      metadata: body.metadata || {},
    };

    const result = await insertActionHistory(payload);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}