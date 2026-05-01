"use client";

import { useState } from "react";

interface ClaimBannerProps {
  businessName: string;
  slug: string;
}

export default function ClaimBanner({ businessName, slug }: ClaimBannerProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, businessName, slug }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-indigo-600 text-white py-3 px-6 text-center text-sm">
        ✅ Got it! We'll be in touch at <strong>{email}</strong> shortly.
      </div>
    );
  }

  return (
    <div className="bg-indigo-600 text-white py-3 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm font-medium">
          🏢 Is this your business? Claim your free website.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="px-3 py-1.5 rounded-lg text-gray-900 text-sm focus:outline-none w-full sm:w-56"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-white text-indigo-600 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition disabled:opacity-50 whitespace-nowrap"
          >
            {status === "loading" ? "Sending…" : "Claim It"}
          </button>
        </form>
        {status === "error" && (
          <p className="text-red-300 text-xs">Something went wrong. Try again.</p>
        )}
      </div>
    </div>
  );
}
