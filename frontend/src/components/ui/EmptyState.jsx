// Shown when a list has nothing in it yet. Always says why, and usually offers the next step.
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl bg-white px-4 py-10 text-center">
      {Icon && (
        <span className="grid size-20 place-items-center rounded-full bg-soil-100 text-soil-700">
          <Icon aria-hidden="true" className="size-10" />
        </span>
      )}
      <h2 className="text-xl font-bold">{title}</h2>
      {message && <p className="max-w-prose text-lg text-ink-muted">{message}</p>}
      {action && <div className="mt-2 w-full max-w-xs">{action}</div>}
    </section>
  );
}
