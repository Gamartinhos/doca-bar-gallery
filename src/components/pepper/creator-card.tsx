import Image from "next/image";
import Link from "next/link";

import { compactNumber } from "@/lib/pepper/format";
import type { PepperCreator, PepperTier } from "@/lib/pepper/types";

import { CreatorAvatar } from "./creator-avatar";

export const TIER_LABEL: Record<PepperTier, string> = {
  rising: "em ascensão",
  core: "casting fixo",
  headline: "headline",
};

export function CreatorCard({
  creator,
  priority = false,
}: {
  creator: PepperCreator;
  priority?: boolean;
}) {
  const reach = creator.followers_instagram + creator.followers_tiktok;

  return (
    <Link
      href={`/pepper/creators/${creator.slug}`}
      className="pp-card pp-card-lit group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {creator.cover_url ? (
          <Image
            src={creator.cover_url}
            alt={`Portfólio de ${creator.name}`}
            fill
            priority={priority}
            unoptimized={!creator.cover_url.startsWith("/")}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover opacity-70 grayscale-[60%] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] group-hover:opacity-100 group-hover:grayscale-0"
          />
        ) : (
          <div className="pp-asphalt absolute inset-0" />
        )}

        {/* Verniz quente que recua no hover — a foto "acende". */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[var(--pp-ink)] via-[var(--pp-ink)]/45 to-transparent transition-opacity duration-500 group-hover:opacity-80"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 mix-blend-color transition-opacity duration-500 group-hover:opacity-0"
          style={{ background: "var(--pp-pepper)" }}
        />

        <span className="pp-chip pp-chip-hot absolute left-3 top-3 z-[4]">
          {TIER_LABEL[creator.tier]}
        </span>

        <div className="absolute inset-x-0 bottom-0 z-[4] p-4">
          <div className="flex items-end gap-3">
            <CreatorAvatar
              name={creator.name}
              slug={creator.slug}
              src={creator.avatar_url}
              size={44}
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-[family-name:var(--pp-font-display)] text-2xl font-black uppercase leading-none tracking-[-0.04em] text-[var(--pp-chalk)]">
                {creator.name}
              </h3>
              {creator.handle && (
                <p className="pp-label mt-1 truncate text-[0.62rem]">
                  @{creator.handle}
                </p>
              )}
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--pp-glass-brd)] pt-3">
            <div>
              <dt className="pp-label text-[0.55rem]">Alcance</dt>
              <dd className="font-[family-name:var(--pp-font-display)] text-lg font-black leading-none text-[var(--pp-chalk)]">
                {compactNumber(reach)}
              </dd>
            </div>
            <div>
              <dt className="pp-label text-[0.55rem]">Views méd.</dt>
              <dd className="font-[family-name:var(--pp-font-display)] text-lg font-black leading-none text-[var(--pp-chalk)]">
                {compactNumber(creator.avg_views)}
              </dd>
            </div>
            <div>
              <dt className="pp-label text-[0.55rem]">Engaj.</dt>
              <dd className="font-[family-name:var(--pp-font-display)] text-lg font-black leading-none text-[var(--pp-ember)]">
                {creator.engagement_rate.toFixed(1).replace(".", ",")}%
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {creator.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--pp-steel)] px-4 py-3">
          {creator.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="pp-chip">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
