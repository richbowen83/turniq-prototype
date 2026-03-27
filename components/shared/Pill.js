export default function Pill({
  children,
  tone = "slate",
  size = "sm",
  className = "",
}) {
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

  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  const style = toneStyles[tone] || toneStyles.slate;
  const sizeStyle = sizeStyles[size] || sizeStyles.sm;

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium leading-none
      ${style} ${sizeStyle} ${className}`}
    >
      {children}
    </span>
  );
}