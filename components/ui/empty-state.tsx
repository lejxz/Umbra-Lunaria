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
    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      {icon && <div className="mb-3 flex justify-center text-umbra-purple">{icon}</div>}
      <p className="font-display text-lg text-umbra-lilac">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-umbra-muted">{description}</p>
    </div>
  );
}
