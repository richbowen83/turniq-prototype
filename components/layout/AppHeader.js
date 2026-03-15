"use client";

import Card from "../shared/Card";
import Selector from "../shared/Selector";

export default function AppHeader({
  selectedMarket,
  setSelectedMarket,
  markets,
}) {
  return (
    <Card className="py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/turniq-logo.png"
            alt="TurnIQ logo"
            className="h-10 w-auto object-contain"
          />

          <div>
            <div className="text-xl font-bold text-slate-900">TurnIQ</div>
            <div className="text-sm text-slate-500">
              AI-powered turn operations prototype
            </div>
          </div>
        </div>

        <Selector
          value={selectedMarket}
          onChange={setSelectedMarket}
          options={markets}
        />
      </div>
    </Card>
  );
}