export default function InlineSpinner({ label = "Loading..." }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
      <span>{label}</span>
    </span>
  );
}