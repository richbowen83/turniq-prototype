import {
  importRowsToTurnIQWithMapping,
  parseCsvText,
  validateRowsWithMapping,
} from "../../../lib/turniqImport";

export async function GET() {
  return Response.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { csvText, mapping } = body || {};

    if (!csvText) {
      return Response.json({ error: "Missing csvText" }, { status: 400 });
    }

    const rows = parseCsvText(csvText);

    if (!rows.length) {
      return Response.json({ error: "CSV contained no rows" }, { status: 400 });
    }

    const validation = validateRowsWithMapping(rows, mapping || {});

    if (!validation.isValid) {
      return Response.json(
        {
          error: "Invalid import mapping",
          missingRequiredFields: validation.missingRequiredFields,
          warnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    const turns = importRowsToTurnIQWithMapping(rows, mapping || {});

    return Response.json({
      ok: true,
      count: turns.length,
      turns,
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error("Import endpoint failed", error);

    return Response.json(
      {
        error: "Unable to import turns",
        detail: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}