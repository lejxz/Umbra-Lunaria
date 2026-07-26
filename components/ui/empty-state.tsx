/**
 * EmptyState — a calm, lunar empty placeholder.
 *
 * Dashed glass tile with a glowing celestial icon and reassuring copy.
 * Used by tables, lists, and panels when there is no data yet.
 */
export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="lunar-card flex flex-col items-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-umbra-line bg-umbra-purple/[.06] text-umbra-purple">
          <span className="[&>svg]:h-7 [&>svg]:w-7">{icon}</span>
        </div>
      )}
      <p className="font-display text-lg text-umbra-moonlight">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-balance text-sm text-umbra-muted">
        {description}
      </p>
    </div>
  );
}
