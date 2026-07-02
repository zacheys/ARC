import Link from "next/link";
import Footer from "@/components/Footer";
import SignupForm from "./SignupForm";

export const metadata = {
  title: "Start your free trial — ARCTrack",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <Link href="/" className="text-lg font-bold text-brand-700">
              ARCTrack
            </Link>
            <h1 className="mt-4 text-xl font-semibold text-ink">
              Start your free trial
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              30 days free. No credit card required.
            </p>
          </div>
          <div className="card p-6">
            <SignupForm />
          </div>
          <p className="mt-4 text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link href="/signin" className="text-brand-700 hover:underline">
              Committee sign in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
