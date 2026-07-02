"use client";

export default function PrintBar({ pdfHref }: { pdfHref: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 print:hidden">
      <button onClick={() => window.print()} className="btn-secondary">
        Print
      </button>
      <a href={pdfHref} target="_blank" className="btn-primary">
        Download PDF
      </a>
    </div>
  );
}
