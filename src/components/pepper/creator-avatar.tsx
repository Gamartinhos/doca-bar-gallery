import Image from "next/image";

import { initials, warmHue } from "@/lib/pepper/format";

/**
 * Avatar do creator. Sem foto, gera um bloco com as iniciais e um matiz
 * estável derivado do slug — some do ar sem depender de host externo (o
 * next.config só libera Supabase e Drive) e sem quebrar a hidratação, já
 * que o matiz é função pura do slug.
 */
export function CreatorAvatar({
  name,
  slug,
  src,
  size = 56,
  className = "",
}: {
  name: string;
  slug: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const hue = warmHue(slug);

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-[var(--pp-glass-brd)] ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          unoptimized={!src.startsWith("/")}
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `linear-gradient(140deg, hsl(${hue} 92% 58%), hsl(${
                (hue + 340) % 360
              } 88% 42%))`,
            }}
          />
          <span
            className="relative font-[family-name:var(--pp-font-display)] font-black leading-none text-white"
            style={{ fontSize: Math.round(size * 0.36) }}
          >
            {initials(name)}
          </span>
        </>
      )}
    </span>
  );
}
