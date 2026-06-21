"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Pill from "../shared/Pill";
import { formatShortDate } from "../../utils/economics";

function formatTime(timestamp) {
  if (!timestamp) return "Now";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildReplayEvents(actionLearningLog = []) {
  return [...actionLearningLog]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 12)
    .map((entry, index) => ({
      id: entry.id || `${entry.propertyId}-${index}`,
      time: formatTime(entry.timestamp),
      title: entry.propertyName || "Turn updated",
      action: entry.actionLabel || "Recommendation applied",
      stage: entry.stage || "Unknown stage",
      daysSaved: entry.daysSaved || 0,
      revenueProtected: entry.revenueProtected || 0,
      risk: entry.risk || 0,
    }));
}

export default function TurnIQReplay({
  rows = [],
  actionLearningLog = [],
  health = {},
  forecastRows = [],
  aiImpactSummary = {},
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const replayEvents = useMemo(
    () => buildReplayEvents(actionLearningLog),
    [actionLearningLog]
  );

  const projectedHealthStart = Math.max(
    0,
    (health.score || 0) - Math.max(1, Math.round((aiImpactSummary.totalDaysRecovered || 0) / 2))
  );

  function handlePlay() {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 1800);
  }

  return (
    <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
            TurnIQ Replay
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            See what TurnIQ changed today
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Reconstructs completed actions, recovered days, protected revenue, and portfolio health movement.
          </div>
        </div>

        <button
          onClick={handlePlay}
          disabled={!replayEvents.length || isPlaying}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPlaying ? "Replaying..." : "▶ Replay Today"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-indigo-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Actions replayed</div>
          <div className="mt-2 text-3xl font-semibold text-indigo-700">
            {aiImpactSummary.actionsCompleted || replayEvents.length}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Days recovered</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-700">
            +{aiImpactSummary.totalDaysRecovered || 0}d
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Revenue protected</div>
          <div className="mt-2 text-3xl font-semibold text-emerald-700">
            ${(aiImpactSummary.totalRevenueProtected || 0).toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Health movement</div>
          <div className="mt-2 text-3xl font-semibold text-blue-700">
            {projectedHealthStart} → {health.score || 0}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              What would have happened without TurnIQ?
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Counterfactual based on completed recommendations and current forecast risk.
            </div>
          </div>

          <Pill tone={forecastRows.length ? "amber" : "green"}>
            {forecastRows.length} risks remaining
          </Pill>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-red-50 p-3">
            <div className="text-xs uppercase tracking-wide text-red-700">Without intervention</div>
            <div className="mt-1 text-sm font-medium text-slate-900">
              +{Math.max(1, aiImpactSummary.totalDaysRecovered || 0)} avoidable delay days
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="text-xs uppercase tracking-wide text-emerald-700">Current reality</div>
            <div className="mt-1 text-sm font-medium text-slate-900">
              ${(aiImpactSummary.totalRevenueProtected || 0).toLocaleString()} protected
            </div>
          </div>

          <div className="rounded-xl bg-blue-50 p-3">
            <div className="text-xs uppercase tracking-wide text-blue-700">Portfolio result</div>
            <div className="mt-1 text-sm font-medium text-slate-900">
              {health.status || "Stable"} operating posture
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {replayEvents.length ? (
          replayEvents.map((event, index) => (
            <div
              key={event.id}
              className={`rounded-2xl border border-slate-200 bg-white p-4 transition ${
                isPlaying ? "translate-y-0 opacity-100" : ""
              }`}
              style={{
                transitionDelay: `${index * 80}ms`,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {event.time}
                  </div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {event.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {event.action} • {event.stage}
                  </div>
                </div>

                <Pill tone={event.daysSaved > 0 ? "green" : "blue"}>
                  +{event.daysSaved}d
                </Pill>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Recovered</div>
                  <div className="mt-1 font-semibold text-slate-900">{event.daysSaved} days</div>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-emerald-700">Protected</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    ${event.revenueProtected.toLocaleString()}
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50 p-3 text-sm">
                  <div className="text-xs uppercase tracking-wide text-blue-700">Risk at action</div>
                  <div className="mt-1 font-semibold text-slate-900">{event.risk}%</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            No replay events yet. Apply a recommendation and TurnIQ Replay will build the story.
          </div>
        )}
      </div>
    </Card>
  );
}