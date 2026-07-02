import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo.png";

/**
 * ARCTrack wordmark logo. Renders the trimmed lockup image and, unless
 * `href` is null, links it. Size via the `className` (e.g. "h-8 w-auto").
 */
export default function Brand({
  className = "h-7 w-auto",
  href = "/" as string | null,
  priority = false,
}: {
  className?: string;
  href?: string | null;
  priority?: boolean;
}) {
  const img = (
    <Image
      src={logo}
      alt="ARCTrack"
      className={className}
      priority={priority}
    />
  );
  if (href === null) return img;
  return (
    <Link href={href} className="inline-flex" aria-label="ARCTrack home">
      {img}
    </Link>
  );
}
