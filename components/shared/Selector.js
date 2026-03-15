export default function Selector({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}