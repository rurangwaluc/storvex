function Line({ w = "w-56" }) {
  return <div className={`h-3.5 rounded-full ${w} bg-[rgb(var(--bg-muted))}`} />;
}

export default function ListSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4 py-3"
        >
          <Line w={i % 2 === 0 ? "w-64" : "w-56"} />
          <Line w="w-20" />
        </div>
      ))}
    </div>
  );
}