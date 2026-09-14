import Link from "next/link";

export function PageScaffold({
  section,
  title,
  description,
  children,
}: {
  section: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1380px] p-5 sm:p-8 lg:p-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-label uppercase tracking-[.16em] text-umbra-purple">
            {section}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-wide text-umbra-lilac sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-umbra-muted">{description}</p>
          )}
        </div>
        <Link
          href="/"
          className="rounded-full border border-umbra-line px-3 py-2 font-mono text-label uppercase tracking-wider text-umbra-muted transition hover:border-umbra-purple/50 hover:text-umbra-lilac"
        >
          Back to overview
        </Link>
      </header>
      {children}
    </div>
  );
}
