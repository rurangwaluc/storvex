export default function StatusBadge({ status }) {
  const map = {
    BORROWED: "bg-yellow-100 text-yellow-800",
    SOLD: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    RETURNED: "bg-gray-200 text-gray-700",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${map[status]}`}>
      {status}
    </span>
  );
}
