export default function ProgressBar({ value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-600",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
  };

  return (
    <div className="h-2 rounded-full bg-gray-100">
      <div
        className={`h-2 rounded-full ${tones[tone]}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}