import Link from "next/link";

/** The Relay brand mark: five vertical bars reading as an audio waveform. */
export function BarsGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="7" width="2.4" height="10" rx="1.2" />
      <rect x="6.9" y="4" width="2.4" height="16" rx="1.2" />
      <rect x="10.8" y="2" width="2.4" height="20" rx="1.2" />
      <rect x="14.7" y="5" width="2.4" height="14" rx="1.2" />
      <rect x="18.6" y="6.5" width="2.4" height="11" rx="1.2" />
    </svg>
  );
}

export function MarketingWordmark({ href = "#top" }: { href?: string }) {
  return (
    <Link className="wordmark" href={href}>
      <span className="wm-badge">
        <BarsGlyph />
      </span>
      Relay
    </Link>
  );
}
