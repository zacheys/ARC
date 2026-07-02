import Link from "next/link";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          Not found
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-2 max-w-md text-sm text-ink-soft">
          The association or request you&rsquo;re looking for doesn&rsquo;t exist
          or may have been moved.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Return home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
