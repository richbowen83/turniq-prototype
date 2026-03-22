"use client";

const TAB_CONFIG = {
  Overview: { glyph: "◫" },
  Dashboard: { glyph: "◉" },
  "Control Center": { glyph: "≡" },
  Forecast: { glyph: "◌" },
  Vendors: { glyph: "◎" },
  Analytics: { glyph: "▦" },
};

export default function TabNav({ tabs, activeTab, onChange }) {
  return (
    <div className="flex justify-start">
      <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          const glyph = TAB_CONFIG[tab]?.glyph || "•";

          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="text-sm leading-none">{glyph}</span>
              <span>{tab}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}