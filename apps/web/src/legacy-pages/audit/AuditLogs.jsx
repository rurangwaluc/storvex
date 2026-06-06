import { useEffect, useState } from "react";

import { getAuditLogs } from "../../services/auditApi";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getAuditLogs().then(setLogs);
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Audit Logs</h1>

      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Entity</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td>{new Date(l.createdAt).toLocaleString()}</td>
              <td>{l.action}</td>
              <td>{l.entity}</td>
              <td>{l.userId || "System"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
