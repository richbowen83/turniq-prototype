"use client";

const TAB_CONFIG = {
  Overview: { glyph: "◫" },
  Dashboard: { glyph: "◉" },
  "Control Center": { glyph: "≡" },
  Forecast: { glyph: "◌" },
  Vendors: { glyph: "◎" },
  Analytics: { glyph: "▦" },
  Import: { glyph: "⇪" },
};

export default function TabNav({ tabs, activeTab, onChange, mode = "operator" }) {
  return (
    <div className="flex justify-start">
      <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          const glyph = TAB_CONFIG[tab]?.glyph || "•";
          const isControlCenter = tab === "Control Center";
          const showExecBadge = isControlCenter && mode === "exec";

          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              } ${showExecBadge && !isActive ? "border border-indigo-200 bg-indigo-50 text-indigo-700" : ""}`}
            >
              <span className="text-sm leading-none opacity-80">{glyph}</span>
              <span className="whitespace-nowrap">{tab}</span>
              {showExecBadge ? (
                <span className="ml-1 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Exec
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}