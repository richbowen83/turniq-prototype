"use client";

export default function TabNav({ tabs, activeTab, onChange }) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const active = tab === activeTab;

          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                active
                  ? "border-blue-600 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}