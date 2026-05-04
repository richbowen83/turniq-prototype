import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { question, rows = [] } = await request.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Question is required" },
        { status: 400 }
      );
    }

    const portfolioContext = rows.slice(0, 75).map((row) => ({
      name: row.name,
      market: row.market,
      stage: row.currentStage,
      status: row.turnStatus,
      daysOpen: row.openDays,
      daysInStage: row.daysInStage,
      risk: row.risk,
      readiness: row.readiness,
      priorityScore: row.aiPriorityScore,
      urgency: row.actionEngine?.urgency,
      recommendation: row.actionEngine?.headline,
      whyNow: row.actionEngine?.whyNow,
      riskDrivers: row.aiRiskDrivers,
      revenueRecovered: row.actionEngine?.revenueRecovered,
      daysRecovered: row.actionEngine?.daysRecovered,
      projectedCompletion: row.projectedCompletion,
      owner: row.turnOwner,
      vendor: row.vendor,
    }));

    const prompt = `
You are Ask TurnIQ, an AI operating assistant for single-family rental turn operations.

Your job:
- Answer using only the turn portfolio data provided.
- Be direct, operator-focused, and concise.
- Prioritize execution, bottlenecks, risk, revenue protection, and next actions.
- If data is missing, say what is missing.
- Do not invent facts.

User question:
${question}

Turn portfolio data:
${JSON.stringify(portfolioContext, null, 2)}
`;

    // Temporary deterministic fallback until OpenAI API key is added
    if (!process.env.OPENAI_API_KEY) {
      const highRisk = portfolioContext.filter((r) => (r.risk || 0) >= 75);
      const blocked = portfolioContext.filter((r) => r.status === "Blocked");
      const top = [...portfolioContext].sort(
        (a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
      )[0];

      return NextResponse.json({
        ok: true,
        answer: `Ask TurnIQ read ${portfolioContext.length} turns. ${highRisk.length} are high-risk and ${blocked.length} are blocked. Top priority is ${top?.name || "not available"}${top?.recommendation ? ` — ${top.recommendation}` : ""}. Add OPENAI_API_KEY to enable full chat reasoning.`,
      });
    }

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
      data.output?.flatMap((item) => item.content || [])
        ?.map((content) => content.text)
        ?.filter(Boolean)
        ?.join("\n") ||
      "No answer returned.";

    return NextResponse.json({
      ok: true,
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