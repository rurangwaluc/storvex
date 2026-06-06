import { useState } from "react";

export default function Payment() {
  const params = new URLSearchParams(window.location.search);
  const intentId = params.get("intentId");

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function pay(e) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("http://localhost:5000/api/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intentId,
        phone,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.message || "Payment failed");
      return;
    }

    setMessage("Payment request sent. Please confirm on your phone.");
  }

  return (
    <form
      onSubmit={pay}
      className="max-w-md mx-auto mt-20 bg-white p-6 rounded shadow"
    >
      <h1 className="text-xl font-bold mb-4">Complete Payment</h1>

      {message && <p className="mb-3">{message}</p>}

      <input
        className="input mb-3"
        placeholder="MTN MoMo Phone (07xxxxxxxx)"
        required
        onChange={(e) => setPhone(e.target.value)}
      />

      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Processing..." : "Pay"}
      </button>
    </form>
  );
}
