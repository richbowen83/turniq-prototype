import { NextResponse } from "next/server";

function buildFallback(row) {
  const reasons = [];

  if (row.turnStatus === "Blocked") reasons.push("it is blocked");
  if (row.currentStage === "Failed Rent Ready") reasons.push("it failed rent-ready");
  if ((row.daysInStage || 0) >= 5) reasons.push(`${row.daysInStage} days in stage`);
  if ((row.risk || 0) >= 75) reasons.push(`risk score ${row.risk}`);
  if (row.blocker && row.blocker !== "None") reasons.push(`blocker: ${row.blocker}`);

  return `This turn appears stuck because ${reasons.join(", ")}. The next best move is to clear the primary blocker, confirm vendor access, and move the turn to the next executable stage today.`;
}

export async function POST(request) {
  try {
    const { row } = await request.json();

    if (!row?.id) {
      return NextResponse.json(
        { ok: false, error: "Turn row is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: true,
        answer: buildFallback(row),
      });
    }

    const prompt = `
You are TurnIQ, an AI operating assistant for single-family rental turn operations.

Explain why this specific turn is stuck and what the operator should do next.

Rules:
- Be concise.
- Use only the data provided.
- Do not invent facts.
- Start with the reason.
- Then give the next best action.
- Include owner/vendor/stage/blocker details if relevant.

Turn:
${JSON.stringify(row, null, 2)}
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
      answer,
    });
  } catch (error) {
    console.error("Turn AI failed", error);

    return NextResponse.json(
      { ok: false, error: error.message || "Turn AI failed" },
      { status: 500 }
    );
  }
}