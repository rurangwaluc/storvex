import { useEffect, useState } from "react";

import { getAuditLogs } from "../../services/auditApi";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getAuditLogs().then(setLogs);
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Audit Logs</h1>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded border-l-4 border-blue-500 bg-white p-3 shadow"
          >
            <div className="text-sm text-gray-500">
              {new Date(log.createdAt).toLocaleString()}
            </div>

            <div className="font-semibold">
              {String(log.action || "").replaceAll("_", " ")}
            </div>

            <div className="text-sm">
              {log.user?.name || "System"} — {log.entity}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}