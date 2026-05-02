"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal state
  const [modal, setModal] = useState<{
    slug: string;
    businessName: string;
    existingWebsite: string | null;
  } | null>(null);
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [copied, setCopied] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setModal({
        slug: data.slug,
        businessName: query,
        existingWebsite: data.existingWebsite ?? null,
      });
    } catch {
      setError("Failed to generate website. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const siteUrl = modal
    ? `${window.location.origin}/sites/${modal.slug}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");

    try {
      const response = await fetch("/api/send-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          businessName: modal?.businessName,
          siteUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setEmailError(data.error || "Failed to send email");
        return;
      }

      setEmailSent(true);
    } catch {
      setEmailError("Failed to send email. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleViewSite = () => {
    if (modal) router.push(`/sites/${modal.slug}`);
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GMB → Website
          </h1>
          <p className="text-gray-500 mb-8">
            Enter a business name or address to instantly generate a professional website.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Joe's Pizza New York"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              required
            />

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Website"}
            </button>
          </form>
        </div>
      </main>

      {/* Save URL Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Your site is live!</h2>
              <p className="text-gray-500 text-sm">Save your URL — it's the only way to get back to your site.</p>
            </div>

            {/* Website check banner */}
            {modal.existingWebsite ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-amber-800 text-sm font-semibold mb-1">⚠️ This business already has a website</p>
                <p className="text-amber-700 text-xs mb-2">Compare it to the one we just built:</p>
                <div className="flex flex-col gap-1.5">
                  <a
                    href={modal.existingWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-700 underline underline-offset-2 truncate"
                  >
                    Their current site →
                  </a>
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 underline underline-offset-2"
                  >
                    Your generated site →
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
                <p className="text-green-800 text-sm font-semibold">✅ This business has no website</p>
                <p className="text-green-700 text-xs mt-1">You just built them one in seconds.</p>
              </div>
            )}

            {/* URL display + copy */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Your site URL</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-700 font-mono truncate flex-1">{siteUrl}</p>
                <button
                  onClick={handleCopy}
                  className="shrink-0 px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-200 transition"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Email it to yourself */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Email it to yourself</p>
              {emailSent ? (
                <p className="text-green-600 text-sm font-medium">✅ Sent! Check your inbox.</p>
              ) : (
                <form onSubmit={handleSendEmail} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="shrink-0 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {emailLoading ? "Sending..." : "Send"}
                  </button>
                </form>
              )}
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>

            {/* View site */}
            <button
              onClick={handleViewSite}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              View My Site →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
