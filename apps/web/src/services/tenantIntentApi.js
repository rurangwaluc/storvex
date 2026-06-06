const API = "http://localhost:5000/api/auth/owner-intent";

export async function createTenantIntent(data) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw err;
  }

  return res.json();
}
