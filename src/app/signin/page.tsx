import Footer from "@/components/Footer";
import Brand from "@/components/Brand";
import SigninForm from "./SigninForm";

export const metadata = {
  title: "Committee sign in — ARCTrack",
};

export default function SigninPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <Brand className="h-9 w-auto" />
            <h1 className="mt-4 text-xl font-semibold text-ink">
              Committee sign in
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Enter your association to continue to its dashboard.
            </p>
          </div>
          <div className="card p-6">
            <SigninForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
