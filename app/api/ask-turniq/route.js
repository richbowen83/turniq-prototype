import { NextResponse } from "next/server";
import { getTurnsByOrg } from "../../../lib/turnsDb";

function buildPortfolioContext(rows) {
  return rows.slice(0, 100).map((row) => ({
    id: row.id,
    name: row.name,
    market: row.market,
    stage: row.currentStage,
    status: row.turnStatus,
    daysOpen: row.openDays,
    daysInStage: row.daysInStage,
    risk: row.risk,
    readiness: row.readiness,
    projectedCompletion: row.projectedCompletion,
    owner: row.turnOwner,
    vendor: row.vendor,
    blockers: row.blockers,
    scope: row.scope,
    alert: row.alert,
    insight: row.insight,
    sourceSystemName: row.sourceSystemName,
    syncStatus: row.syncStatus,
    lastSyncedAt: row.lastSyncedAt,
  }));
}

function buildDeterministicAnswer(question, rows) {
  const highRisk = rows.filter((row) => (row.risk || 0) >= 75);
  const blocked = rows.filter((row) => row.turnStatus === "Blocked");
  const ownerApproval = rows.filter((row) => row.currentStage === "Owner Approval");
  const failedReady = rows.filter((row) => row.currentStage === "Failed Rent Ready");

  const top = [...rows].sort((a, b) => {
    return (
      (b.risk || 0) - (a.risk || 0) ||
      (b.daysInStage || 0) - (a.daysInStage || 0) ||
      (b.openDays || 0) - (a.openDays || 0)
    );
  })[0];

  return [
    `I reviewed ${rows.length} live turns for this org.`,
    `${highRisk.length} are high-risk, ${blocked.length} are blocked, ${ownerApproval.length} are in owner approval, and ${failedReady.length} are failed rent ready.`,
    top
      ? `Highest-priority turn: ${top.name} in ${top.market}. It is in ${top.currentStage}, risk ${top.risk}, open ${top.openDays} days, and ${top.daysInStage} days in stage.`
      : "No turn rows are currently available.",
    "Add or confirm OPENAI_API_KEY to enable full natural-language reasoning."
  ].join("\n\n");
}

export async function POST(request) {
  try {
    const body = await request.json();

    const question = body.question || "";
    const orgId =
      request.headers.get("x-turniq-org-id") ||
      body.orgId ||
      "demo";

    if (!question.trim()) {
      return NextResponse.json(
        { ok: false, error: "Question is required" },
        { status: 400 }
      );
    }

    const rows = await getTurnsByOrg(orgId);
    const portfolioContext = buildPortfolioContext(rows);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: true,
        orgId,
        source: "supabase",
        rowCount: rows.length,
        answer: buildDeterministicAnswer(question, rows),
      });
    }

    const prompt = `
You are Ask TurnIQ, an AI operating assistant for single-family rental turn operations.

Use only the live portfolio data provided below. Do not invent facts.

Answer style:
- Be direct and operator-focused.
- Start with the answer.
- Then explain why.
- Include specific turns, markets, stages, owners, blockers, and risk where relevant.
- Recommend clear next actions.
- If the data is insufficient, say what is missing.

Org ID:
${orgId}

User question:
${question}

Live turn portfolio:
${JSON.stringify(portfolioContext, null, 2)}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.5",
        input: prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "OpenAI request failed");
    }

    const answer =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        ?.map((content) => content.text)
        ?.filter(Boolean)
        ?.join("\n") ||
      "No answer returned.";

    return NextResponse.json({
      ok: true,
      orgId,
      source: "supabase",
      rowCount: rows.length,
      answer,
    });
  } catch (error) {
    console.error("Ask TurnIQ failed", error);

    return NextResponse.json(
      { ok: false, error: error.message || "Ask TurnIQ failed" },
      { status: 500 }
    );
  }
}