import Link from "next/link";

export function PageScaffold({
  section,
  title,
  description,
  eyebrow,
  children,
}: {
  section: string;
  title: string;
  description: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1380px] p-5 sm:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
            {section} / {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-umbra-lilac sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-umbra-muted">{description}</p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-umbra-line px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-umbra-muted transition hover:border-umbra-purple/50 hover:text-umbra-lilac"
        >
          Back to overview
        </Link>
      </header>
      {children}
    </div>
  );
}

export function ComingSoon({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <section className="glass rounded-2xl p-8 sm:p-10">
      <p className="font-mono text-[10px] uppercase tracking-[.16em] text-umbra-purple">
        {label}
      </p>
      <h2 className="mt-3 font-display text-2xl text-umbra-lilac">
        The observatory is ready.
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-umbra-muted">
        {description}
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white/[.035] p-4">
          <p className="text-xs uppercase tracking-wider text-umbra-muted">Data source</p>
          <p className="mt-2 text-sm text-umbra-lilac">Neon snapshots</p>
        </div>
        <div className="rounded-xl bg-white/[.035] p-4">
          <p className="text-xs uppercase tracking-wider text-umbra-muted">Status</p>
          <p className="mt-2 text-sm text-emerald-300">Ready for build</p>
        </div>
        <div className="rounded-xl bg-white/[.035] p-4">
          <p className="text-xs uppercase tracking-wider text-umbra-muted">Next signal</p>
          <p className="mt-2 text-sm text-umbra-lilac">Coming soon</p>
        </div>
      </div>
    </section>
  );
}
