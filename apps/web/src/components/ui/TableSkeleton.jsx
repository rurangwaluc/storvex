function Row({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-3">
          <div
            className={`h-3.5 rounded-full bg-[rgb(var(--bg-muted))] ${
              i === 0 ? "w-40" : i === cols - 1 ? "ml-auto w-28" : "w-24"
            }`}
          />
        </td>
      ))}
    </tr>
  );
}

export default function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <Row key={i} cols={cols} />
      ))}
    </>
  );
}