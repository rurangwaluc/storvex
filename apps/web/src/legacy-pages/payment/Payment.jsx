import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/apiClient";

export default function Payment() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const intentId = params.get("intentId");

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function pay(e) {
    e.preventDefault();

    if (!intentId) {
      setMessage("Payment session is missing. Please restart the signup process.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await apiFetch("/payments/initiate", {
        method: "POST",
        body: {
          intentId,
          phone,
        },
      });

      setMessage("Payment request sent. Please confirm on your phone. You will log in after activation.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      setMessage(error?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={pay}
      className="mx-auto mt-20 max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 className="mb-2 text-xl font-bold text-slate-950">Complete payment</h1>

      <p className="mb-4 text-sm text-slate-600">
        Enter the phone number that should receive the mobile money payment request.
      </p>

      {message && (
        <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      )}

      <label className="mb-2 block text-sm font-semibold text-slate-800">
        MTN MoMo phone
      </label>

      <input
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
        placeholder="07xxxxxxxx"
        value={phone}
        required
        onChange={(e) => setPhone(e.target.value)}
      />

      <button
        className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Processing..." : "Pay"}
      </button>
    </form>
  );
}

