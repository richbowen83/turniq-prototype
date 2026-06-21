"use client";

import { useMemo, useState } from "react";
import Card from "../shared/Card";
import Selector from "../shared/Selector";

const ROLE_OPTIONS = [
  "Turn Coordinator",
  "Turn Dispatcher",
  "Turn Manager",
  "Regional Manager",
  "Executive",
  "Admin",
];

export default function AppHeader({
  selectedMarket,
  setSelectedMarket,
  markets,
  user = {
    name: "Richard Bowen",
    email: "richardgjbowen@gmail.com",
    role: "Executive",
  },
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [activeRole, setActiveRole] = useState(user.role || "Executive");

  const initials = useMemo(() => {
    return (user.name || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user.name]);

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  return (
    <Card className="py-3">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src="/turniq-logo.png"
            alt="TurnIQ logo"
            className="h-10 w-auto object-contain"
          />

          <div>
            <div className="text-xl font-bold text-slate-900">TurnIQ</div>
            <div className="text-sm text-slate-500">
              The Agentic Operating System for Property Turns
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Selector
            value={selectedMarket}
            onChange={setSelectedMarket}
            options={markets}
          />

          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700">AI Live</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                {initials}
              </div>

              <div className="hidden text-left md:block">
                <div className="text-sm font-semibold text-slate-900">
                  {user.name || "User"}
                </div>
                <div className="text-xs text-slate-500">{activeRole}</div>
              </div>
            </button>

            {showMenu && (
              <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {user.name || "User"}
                  </div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                  <div className="mt-1 text-xs font-medium text-blue-700">
                    {activeRole}
                  </div>
                </div>

                <div className="border-t border-slate-200" />

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