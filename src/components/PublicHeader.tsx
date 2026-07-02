import Image from "next/image";

export default function PublicHeader({
  hoaName,
  logoUrl,
}: {
  hoaName: string;
  logoUrl?: string | null;
}) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`${hoaName} logo`}
            width={40}
            height={40}
            className="h-10 w-10 rounded object-contain"
          />
        ) : null}
        <div>
          <div className="font-semibold text-ink">{hoaName}</div>
          <div className="text-xs text-ink-muted">
            Architectural Review Committee
          </div>
        </div>
      </div>
    </header>
  );
}
