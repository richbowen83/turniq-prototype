"use client";

import Card from "../shared/Card";
import Pill from "../shared/Pill";

const STAGES = [
  "Pre-Leasing",
  "Pre-Move Out Inspection",
  "Move Out Inspection",
  "Scope Review",
  "Owner Approval",
  "Dispatch",
  "Pending RRI",
  "Rent Ready Open",
];

const VENDORS = ["FloorCo", "ABC Paint", "Sparkle", "CoolAir", "Prime Paint"];

function toDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(dateStr, days) {
  const d = toDate(dateStr);
  if (!d) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getRiskDelay(risk) {
  if (risk >= 85) return 4;
  if (risk >= 75) return 3;
  if (risk >= 65) return 2;
  if (risk >= 55) return 1;
  return 0;
}

function getStageDelay(stage) {
  if (stage === "Owner Approval") return 3;
  if (stage === "Dispatch") return 2;
  if (stage === "Scope Review") return 2;
  if (stage === "Move Out Inspection") return 1;
  return 0;
}

function getBlockerSeverity(blocker) {
  const b = String(blocker || "").toLowerCase();
  if (
    b.includes("approval") ||
    b.includes("access") ||
    b.includes("hvac") ||
    b.includes("inspection")
  ) {
    return 2;
  }
  return 1;
}

function getLiveBlockers(blockers = []) {
  return blockers.filter(
    (b) => b && b !== "No active blockers" && b !== "No major blockers"
  );
}

function buildForecast(row) {
  const blockers = getLiveBlockers(row.blockers);
  const forecastDaysLate =
    getRiskDelay(row.risk) +
    getStageDelay(row.currentStage) +
    blockers.reduce((sum, blocker) => sum + getBlockerSeverity(blocker), 0);

  const forecastCompletion = addDays(row.projectedCompletion, forecastDaysLate);

  return {
    forecastDaysLate,
    forecastCompletion,
  };
}

export default function ControlCenterTab({
  rows,
  queueFilter,
  setQueueFilter,
  resetQueueView,
  selectedStageFilter,
  toggleStageFilter,
  sortBy,
  setSortBy,
  operatorSummary,
  selectedPropertyId,
  setSelectedPropertyId,
  updateProperty,
  getToneFromRisk,
  stagePipeline,
  topStageBottleneck,
  saveRow,
  openRow,
  savedRowIds,
  dirtyRowIds,
  markDirtyRow,
}) {
  const maxCount = Math.max(...stagePipeline.map((s) => s.count), 1);
  const enrichedRows = rows.map((row) => ({ ...row, ...buildForecast(row) }));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-3xl font-semibold text-slate-900">Control Center</div>
        <div className="mt-1 text-sm text-slate-500">
          The Control Center is where operators manage active turns. It coordinates vendors, tracks job progress, monitors readiness blockers, and ensures each home moves efficiently from move-out to rent ready.
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-900">What does Forecast mean?</span>{" "}
          Forecast estimates where actual completion will likely land based on current stage pressure, blocker severity, and portfolio risk exposure.
          <span className="ml-2 text-slate-500">+4d = High Delay Risk • +2–3d = Watch • 0–1d = On Track</span>
        </div>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Stage Pipeline</div>
            <div className="mt-1 text-sm text-slate-500">
              Click a stage to filter the queue below.
            </div>
          </div>

          {topStageBottleneck ? (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-slate-500">Bottleneck</div>
              <div className="mt-1 font-semibold text-slate-900">{topStageBottleneck.stage}</div>
              <div className="text-sm text-amber-600">
                avg {topStageBottleneck.avgDaysInStage} days
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stagePipeline.map((stage) => {
            const isBottleneck = topStageBottleneck?.stage === stage.stage;
            const isSelected = selectedStageFilter === stage.stage;

            return (
              <button
                key={stage.stage}
                onClick={() => toggleStageFilter(stage.stage)}
                className="cursor-pointer text-left"
              >
                <div
                  className={`rounded-2xl border p-4 transition hover:shadow-md ${
                    isSelected
                      ? "border-blue-400 bg-blue-50 shadow-sm"
                      : isBottleneck
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <div className="text-sm font-medium text-slate-500">{stage.stage}</div>

                  <div className="mt-3 text-3xl font-semibold text-slate-900">
                    {stage.count}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    avg {stage.avgDaysInStage} days
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {stage.blockedPercent}% blocked
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${
                        isSelected
                          ? "bg-blue-600"
                          : isBottleneck
                          ? "bg-amber-500"
                          : stage.count >= 3
                          ? "bg-red-500"
                          : stage.count >= 1
                          ? "bg-blue-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${(stage.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Operator Summary</div>
            <div className="mt-1 text-sm text-slate-500">
              Quick view of active workload by operator.
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {operatorSummary.map((row) => (
            <div key={row.owner} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-medium text-slate-900">{row.owner}</div>
              <div className="mt-2 text-sm text-slate-500">{row.activeTurns} active turns</div>
              <div className="mt-1 text-sm text-slate-500">{row.highRisk} high risk</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-5">
          <div className="text-lg font-semibold text-slate-900">Active Turn Queue</div>
          <div className="mt-1 text-sm text-slate-500">
            Editable queue for stage, ECD, vendor, blocker, and forecast monitoring.
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium text-slate-700">Queue:</div>
          <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm">{queueFilter}</div>

          {selectedStageFilter ? (
            <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Stage: {selectedStageFilter}
            </div>
          ) : null}

          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm font-medium text-slate-700">Sort:</div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option>Risk</option>
              <option>Open Days</option>
              <option>ECD</option>
              <option>Stage</option>
            </select>

            <button
              onClick={resetQueueView}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="max-h-[460px] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-3 py-2 font-medium">Property</th>
                <th className="px-3 py-2 font-medium">Market</th>
                <th className="px-3 py-2 font-medium">Open Days</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Forecast</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">ECD</th>
                <th className="px-3 py-2 font-medium">Forecast Date</th>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Blockers</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrichedRows.map((row) => {
                const isDirty = dirtyRowIds.includes(row.id);
                const isSaved = savedRowIds.includes(row.id) && !isDirty;

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-50 ${
                      row.id === selectedPropertyId ? "bg-slate-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-3 py-3">
                      <button
                        onClick={() => setSelectedPropertyId(row.id)}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="px-3 py-3">{row.market}</td>
                    <td className="px-3 py-3">{row.openDays}</td>
                    <td className="px-3 py-3">
                      <Pill tone={getToneFromRisk(row.risk)}>{row.risk}</Pill>
                    </td>
                    <td className="px-3 py-3">
                      <Pill
                        tone={
                          row.forecastDaysLate >= 4
                            ? "red"
                            : row.forecastDaysLate >= 2
                            ? "amber"
                            : "emerald"
                        }
                      >
                        {row.forecastDaysLate === 0 ? "On time" : `+${row.forecastDaysLate}d`}
                      </Pill>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={row.currentStage}
                        onChange={(e) => {
                          updateProperty(row.id, { currentStage: e.target.value });
                          markDirtyRow(row.id);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      >
                        {STAGES.map((stage) => (
                          <option key={stage}>{stage}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="date"
                        value={row.projectedCompletion}
                        onChange={(e) => {
                          updateProperty(row.id, { projectedCompletion: e.target.value });
                          markDirtyRow(row.id);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-600">{row.forecastCompletion}</td>
                    <td className="px-3 py-3">
                      <select
                        value={row.vendor}
                        onChange={(e) => {
                          updateProperty(row.id, { vendor: e.target.value });
                          markDirtyRow(row.id);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2"
                      >
                        {VENDORS.map((vendor) => (
                          <option key={vendor}>{vendor}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.blockers?.slice(0, 2).map((blocker) => (
                          <span
                            key={blocker}
                            className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700"
                          >
                            {blocker}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">{row.turnOwner}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveRow(row.id)}
                          className={`rounded-xl px-3 py-2 text-sm ${
                            isSaved
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {isSaved ? "Saved" : "Save"}
                        </button>

                        <button
                          onClick={() => openRow(row.id)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}