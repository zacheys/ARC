import Footer from "@/components/Footer";
import StatusLookup from "./StatusLookup";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Check your request status — ARCTrack",
};

export default function StatusPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="text-lg font-bold text-brand-700">ARCTrack</div>
            <h1 className="mt-4 text-xl font-semibold text-ink">
              Check your request status
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Enter your reference number and the email you submitted with.
            </p>
          </div>

          <StatusLookup />
        </div>
      </main>
      <Footer />
    </div>
  );
}
