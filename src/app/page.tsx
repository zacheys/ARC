import Link from "next/link";
import Footer from "@/components/Footer";
import Brand from "@/components/Brand";

// Placeholder contact address — change to your real sales inbox.
const CONTACT_EMAIL = "zachary@arctrack.org";

const CLOCKS = [
  {
    label: "Clock 1",
    title: "Written denial",
    body: "A denial must be in writing and state the specific reasons, along with the changes, if any, that would gain approval. ARCTrack requires both before a denial can be recorded.",
  },
  {
    label: "Clock 2",
    title: "30-day appeal window",
    body: "The homeowner has 30 days from the date of the denial notice to request a hearing before the board. ARCTrack counts down that window from the notice date.",
  },
  {
    label: "Clock 3",
    title: "30-day hearing deadline",
    body: "Once a hearing is requested, the board must hold it within 30 days. ARCTrack starts that clock automatically and surfaces it before time runs out.",
  },
];

const FEATURES = [
  {
    title: "Deadline engine",
    body: "Every request is tracked against its statutory clock and color-coded by urgency, so the committee always knows what needs attention first.",
  },
  {
    title: "Denial letter generator",
    body: "Produce a compliant denial letter with the required reasons, changes, and hearing-rights notice — viewable on screen and downloadable as a PDF.",
  },
  {
    title: "Public submission form",
    body: "Homeowners submit requests online with photos and documents. Confirmation and committee-notification emails go out automatically.",
  },
];

const PRICING_INCLUDES = [
  "Unlimited requests",
  "Committee dashboard",
  "Deadline reminders",
  "Denial letter generator",
  "Records archive",
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4">
          <Brand className="h-8 w-auto" priority />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/status"
              className="hidden text-sm font-medium text-ink-soft hover:text-ink sm:inline"
            >
              Check request status
            </Link>
            <Link href="/submit" className="btn-secondary">
              Submit a Request
            </Link>
            <Link href="/signin" className="btn-primary">
              Committee sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <span className="badge bg-brand-50 text-brand-700">
              Texas Property Code &sect;209.00505
            </span>
            <h1 className="mt-6 font-serif text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
              Never miss a statutory deadline on an architectural decision.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              ARCTrack tracks every architectural request against the deadlines
              Texas law requires, generates compliant denial letters, and
              reminds your committee before a clock runs out.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary w-full sm:w-auto">
                Start free trial
              </Link>
              <Link href="/signin" className="btn-secondary w-full sm:w-auto">
                Committee sign in
              </Link>
              <Link href="/status" className="btn-secondary w-full sm:w-auto">
                Check request status
              </Link>
            </div>
          </div>
        </section>

        {/* The three clocks */}
        <section className="mx-auto max-w-5xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              The three clocks ARCTrack watches for you
            </h2>
            <p className="mt-3 text-ink-soft">
              A missed step can cost an association the ability to enforce its
              decision. These are the deadlines that matter most.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {CLOCKS.map((clock) => (
              <div key={clock.title} className="card flex h-full flex-col p-6">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {clock.label}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-ink">
                  {clock.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {clock.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-gray-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-ink">
                Built for the committee&rsquo;s workflow
              </h2>
              <p className="mt-3 text-ink-soft">
                From the moment a request arrives to the day it is archived as a
                permanent record.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="card flex h-full flex-col p-6"
                >
                  <h3 className="text-lg font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mx-auto max-w-5xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Simple pricing
            </h2>
            <p className="mt-3 text-ink-soft">
              One plan per association. No tiers, no per-seat charges.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-sm">
            <div className="card flex flex-col p-8 text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold tracking-tight text-ink">
                  $39
                </span>
                <span className="text-sm text-ink-muted">
                  per association / month
                </span>
              </div>
              <ul className="mt-8 space-y-3 text-left text-sm text-ink-soft">
                {PRICING_INCLUDES.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-0.5 font-semibold text-brand-600"
                    >
                      &#10003;
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="btn-primary mt-8 w-full">
                Start your free trial
              </Link>
              <p className="mt-4 text-xs text-ink-muted">
                30-day free trial. No credit card required.
              </p>
              <p className="mt-2 text-xs text-ink-muted">
                Questions?{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=ARCTrack%20for%20our%20association`}
                  className="text-brand-700 hover:underline"
                >
                  Contact us
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
