import Link from "next/link";

/**
 * PageScaffold — consistent page chrome for sub-pages.
 *
 * Celestial Observatory: section eyebrow uses the mono numeral + fading rule
 * treatment; the "Back to overview" link is a ghost glass chip.
 */
export function PageScaffold({
  section,
  title,
  description,
  eyebrow,
  children,
}: {
  section: string;
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1380px] p-5 sm:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-label font-semibold uppercase tracking-[0.16em] text-umbra-purple">
            {section}
            {eyebrow ? ` / ${eyebrow}` : ""}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-umbra-moonlight sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-balance text-sm text-umbra-muted">
              {description}
            </p>
          )}
        </div>
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-umbra-line bg-umbra-purple/[.04] px-3 py-2 font-mono text-label uppercase tracking-wider text-umbra-muted transition-all duration-150 hover:border-umbra-line-bright hover:text-umbra-lilac"
          style={{ ["--tw-border-opacity" as string]: 1 }}
        >
          ← Back to overview
        </Link>
      </header>
      {children}
    </div>
  );
}

/**
 * ComingSoon — calm placeholder for not-yet-built surfaces.
 */
export function ComingSoon({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <section className="lunar-card p-5 sm:p-10">
      <p className="font-mono text-label font-semibold uppercase tracking-[0.16em] text-umbra-purple">
        {label}
      </p>
      <h2 className="mt-3 font-display text-2xl text-umbra-moonlight">
        The observatory is ready.
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-umbra-muted">
        {description}
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="lunar-tile">
          <p className="font-mono text-label uppercase tracking-wider text-umbra-faint">
            Data source
          </p>
          <p className="mt-2 text-sm text-umbra-lilac">Supabase snapshots</p>
        </div>
        <div className="lunar-tile">
          <p className="font-mono text-label uppercase tracking-wider text-umbra-faint">
            Status
          </p>
          <p className="mt-2 text-sm text-emerald-300">Ready for build</p>
        </div>
        <div className="lunar-tile">
          <p className="font-mono text-label uppercase tracking-wider text-umbra-faint">
            Next signal
          </p>
          <p className="mt-2 text-sm text-umbra-lilac">Coming soon</p>
        </div>
      </div>
    </section>
  );
}
