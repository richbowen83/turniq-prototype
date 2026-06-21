"use client";

import { useState } from "react";
import Card from "../shared/Card";
import Selector from "../shared/Selector";

export default function AppHeader({
  selectedMarket,
  setSelectedMarket,
  markets,
}) {
  const [showMenu, setShowMenu] = useState(false);

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  return (
    <Card className="py-3">
      <div className="flex items-center justify-between gap-6">
        {/* Left */}

        <div className="flex items-center gap-4">
          <img
            src="/turniq-logo.png"
            alt="TurnIQ logo"
            className="h-10 w-auto object-contain"
          />

          <div>
            <div className="text-xl font-bold text-slate-900">
              TurnIQ
            </div>

            <div className="text-sm text-slate-500">
              The Agentic Operating System for Property Turns
            </div>
          </div>
        </div>

        {/* Right */}

        <div className="flex items-center gap-3">
          <Selector
            value={selectedMarket}
            onChange={setSelectedMarket}
            options={markets}
          />

          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">
              AI Live
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                RB
              </div>

              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900">
                  Richard Bowen
                </div>

                <div className="text-xs text-slate-500">
                  COO
                </div>
              </div>
            </button>

            {showMenu && (
              <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <button className="block w-full px-4 py-3 text-left hover:bg-slate-50">
                  Profile
                </button>

                <button className="block w-full px-4 py-3 text-left hover:bg-slate-50">
                  Settings
                </button>

                <button className="block w-full px-4 py-3 text-left hover:bg-slate-50">
                  Organization
                </button>

                <div className="border-t border-slate-200" />

                <button
                  onClick={handleLogout}
                  className="block w-full px-4 py-3 text-left text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}