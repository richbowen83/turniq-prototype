export default function Pill({ children, tone = "slate" }) {
  const toneStyles = {
    red: "bg-red-100 text-red-700 border border-red-200",
    amber: "bg-amber-100 text-amber-700 border border-amber-200",
    green: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    slate: "bg-slate-100 text-slate-700 border border-slate-200",

    // Backward compatibility
    emerald: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border border-blue-200",
    rose: "bg-rose-100 text-rose-700 border border-rose-200",
  };

  const style = toneStyles[tone] || toneStyles.slate;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {children}
    </span>
  );
}