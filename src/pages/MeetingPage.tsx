// src/features/Training/pages/Training.tsx
import React, { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

/******************************
 * Brand + shared helpers (mirror Landing.tsx)
 ******************************/
const BRAND_BLUE = "#0033A0"; // primary brand
const BRAND_RED = "#E81D33"; // accent

// Local Container, same sizing as Landing
const Container: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="mx-auto w-full max-w-7xl px-3 md:px-[3vw]">{children}</div>
);

/******************************
 * Training sessions (UTC) → render in viewer's local timezone
 ******************************/
type Session = { id: string; startsAtUtc: string };

const SESSIONS: Session[] = [
  { id: "s1", startsAtUtc: "2025-09-03T00:30:00Z" }, // Wed Sept 3, 8:30 PM ET
  { id: "s2", startsAtUtc: "2025-09-08T21:30:00Z" }, // Mon Sept 8, 5:30 PM ET
  { id: "s3", startsAtUtc: "2025-09-15T21:30:00Z" },
  { id: "s4", startsAtUtc: "2025-09-22T21:30:00Z" },
  { id: "s5", startsAtUtc: "2025-09-24T00:30:00Z" }, // Wed Sept 24, 8:30 PM ET
  { id: "s6", startsAtUtc: "2025-09-29T21:30:00Z" },
];

const formatLocal = (isoUtc: string) => {
  const d = new Date(isoUtc);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
};

/******************************
 * Page
 ******************************/
const Training: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sessions = useMemo(
    () => SESSIONS.map((s) => ({ ...s, label: formatLocal(s.startsAtUtc) })),
    []
  );

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!name.trim() || !email.trim() || !sessionId) {
      setMessage({ type: "err", text: "Please fill in your name, email, and pick a session." });
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      setMessage({ type: "err", text: "Please enter a valid email address." });
      return;
    }

    try {
      setSubmitting(true);
      // 🔌 TODO: point to your API endpoint for training signups, e.g. "/API/trainings/signup.php"
      // For now we mimic success:
      await new Promise((r) => setTimeout(r, 600));
      setMessage({ type: "ok", text: "Thank you for signing up! Check your email for details." });
      setName("");
      setEmail("");
      setSessionId("");
    } catch (err) {
      setMessage({ type: "err", text: "Could not submit right now. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="core bg-white">
      {/* ✅ Consistent site header */}
      <Navbar />

      {/* Hero section styled to match Landing aesthetic */}
      <section className="bg-gray-50 border-b">
        <Container>
          <div className="py-12 md:py-16 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold" style={{ color: BRAND_BLUE }}>
              Attend The People’s Network Training
            </h1>
            <p className="mt-4 text-lg text-gray-700 max-w-2xl mx-auto">
              Join us to learn how to be an effective community organizer.
            </p>
            <div className="h-1 w-40 mx-auto mt-6 rounded-full" style={{ backgroundColor: BRAND_RED }} />
          </div>
        </Container>
      </section>

      {/* Content */}
      <section className="bg-white">
        <Container>
          <div className="grid gap-8 md:grid-cols-2 py-10 md:py-14">
            {/* Left: Schedule */}
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border">
              <h2 className="text-2xl font-extrabold" style={{ color: BRAND_BLUE }}>
                Upcoming Training Sessions
              </h2>
              <p className="mt-2 text-gray-700">Times shown in your local timezone.</p>
              <ul className="mt-5 space-y-3 list-disc list-inside text-gray-800">
                {sessions.map((s) => (
                  <li key={s.id}>{s.label}</li>
                ))}
              </ul>
            </div>

            {/* Right: Signup form */}
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border">
              <h2 className="text-2xl font-extrabold" style={{ color: BRAND_BLUE }}>
                Sign Up
              </h2>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4" aria-live="polite">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-1">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 rounded-md border shadow-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: BRAND_BLUE }}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 rounded-md border shadow-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: BRAND_BLUE }}
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>

                <fieldset className="mt-2">
                  <legend className="block text-sm font-semibold text-gray-800 mb-2">Choose a session</legend>
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <label key={s.id} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="session"
                          value={s.id}
                          checked={sessionId === s.id}
                          onChange={() => setSessionId(s.id)}
                          className="h-4 w-4"
                          style={{ accentColor: BRAND_BLUE }}
                          required
                        />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {message && (
                  <p
                    className={`text-center font-bold text-sm ${
                      message.type === "ok" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {message.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center rounded-full px-5 py-3 font-bold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: BRAND_RED }}
                >
                  {submitting ? "Submitting…" : "Sign Up"}
                </button>
              </form>
            </div>
          </div>
        </Container>
      </section>

      {/* ✅ Footer matching Landing look */}
      <Footer />
    </main>
  );
};

export default Training;
