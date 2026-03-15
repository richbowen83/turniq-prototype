export default function Pill({ children, tone = "slate" }) {
  const tones = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}