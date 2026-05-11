import {
  groupBacklog,
  listBacklog,
  KIND_LABEL,
  PRIORITY_LABEL,
  type BacklogItem,
  type BacklogPriority,
  type BacklogStatus,
} from "@/lib/data/backlog";
import {
  createBacklogItemAction,
  updateBacklogStatusAction,
  deleteBacklogItemAction,
} from "./backlog-actions";

/**
 * Admin-only backlog surface embedded on /coach/system. Wraps the
 * data access + server actions into one component the page can
 * drop in as a section.
 */
export default async function Backlog() {
  const items = await listBacklog();
  const grouped = groupBacklog(items);

  const totals = {
    open: items.filter((i) => i.status === "open").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
    done: items.filter((i) => i.status === "done").length,
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">Backlog</div>
          <h2 className="font-display text-2xl md:text-3xl">Roadmap & issues</h2>
          <p className="mt-1 text-sm text-fg-dim max-w-md">
            Features, ændringer og fixes. Synlig kun for admins (RLS).
            Markeret &ldquo;done&rdquo; bevares som changelog.
          </p>
        </div>
        <div className="flex gap-3 text-xs font-mono uppercase tracking-[0.14em] text-fg-dim">
          <span>{totals.open} open</span>
          <span>·</span>
          <span>{totals.in_progress} active</span>
          <span>·</span>
          <span>{totals.done} done</span>
        </div>
      </div>

      <QuickAdd />

      <div className="space-y-6">
        {grouped.map((group) =>
          group.items.length === 0 ? null : (
            <div key={group.status}>
              <div className="eyebrow mb-2 flex items-center gap-2">
                <StatusDot status={group.status} />
                {group.label}
                <span className="text-fg-faint">·</span>
                <span className="text-fg-faint">{group.items.length}</span>
              </div>
              <ul className="surface-2 rounded-2xl divide-y hairline overflow-hidden">
                {group.items.map((item) => (
                  <BacklogRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          )
        )}
        {items.length === 0 ? (
          <div className="surface-2 rounded-2xl px-5 py-8 text-center text-sm text-fg-dim">
            Ingen items endnu — tilføj første ovenfor.
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------------------- atoms ---------------------------- */

function QuickAdd() {
  return (
    <form
      action={createBacklogItemAction}
      className="surface-2 rounded-2xl p-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end"
    >
      <label className="block md:col-span-1">
        <span className="eyebrow block mb-1.5">Titel</span>
        <input
          name="title"
          required
          minLength={3}
          maxLength={200}
          placeholder="Kort beskrivelse — fx 'Tilføj password-recovery flow'"
          className="field h-10"
        />
      </label>
      <label className="block">
        <span className="eyebrow block mb-1.5">Type</span>
        <select name="kind" defaultValue="feature" className="field h-10">
          <option value="feature">Feature</option>
          <option value="change">Change</option>
          <option value="fix">Fix</option>
        </select>
      </label>
      <label className="block">
        <span className="eyebrow block mb-1.5">Priority</span>
        <select name="priority" defaultValue="medium" className="field h-10">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>
      <button type="submit" className="btn btn-primary h-10">
        Tilføj →
      </button>
      <label className="block md:col-span-4">
        <span className="eyebrow block mb-1.5">Beskrivelse (valgfri)</span>
        <textarea
          name="description"
          rows={2}
          maxLength={2000}
          placeholder="Mere kontekst, links, acceptance criteria…"
          className="field py-2 min-h-[60px] resize-y w-full"
        />
      </label>
    </form>
  );
}

function BacklogRow({ item }: { item: BacklogItem }) {
  const isTerminal = item.status === "done" || item.status === "wontfix";
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <KindBadge kind={item.kind === "fix" ? "fix" : item.kind} />
            <PriorityBadge priority={item.priority} />
            {item.createdByHandle ? (
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                @{item.createdByHandle}
              </span>
            ) : null}
          </div>
          <div
            className={`font-display text-base leading-snug ${
              isTerminal ? "text-fg-dim line-through decoration-fg-faint" : ""
            }`}
          >
            {item.title}
          </div>
          {item.description ? (
            <p className="mt-1 text-sm text-fg-dim whitespace-pre-wrap break-words">
              {item.description}
            </p>
          ) : null}
          <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
            {new Date(item.createdAt).toLocaleDateString("da-DK", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            {item.completedAt ? (
              <>
                {" · shipped "}
                {new Date(item.completedAt).toLocaleDateString("da-DK", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </>
            ) : null}
          </div>
        </div>
        <StatusActions item={item} />
      </div>
    </li>
  );
}

function StatusActions({ item }: { item: BacklogItem }) {
  // Build the set of allowed transitions per current state. Each is
  // a self-contained <form> so it works without client-side JS.
  const transitions: { status: BacklogStatus; label: string }[] = [];
  if (item.status === "open") {
    transitions.push({ status: "in_progress", label: "Take" });
    transitions.push({ status: "done", label: "Done" });
    transitions.push({ status: "wontfix", label: "Won't fix" });
  } else if (item.status === "in_progress") {
    transitions.push({ status: "done", label: "Done" });
    transitions.push({ status: "open", label: "Pause" });
  } else if (item.status === "done") {
    transitions.push({ status: "open", label: "Reopen" });
  } else if (item.status === "wontfix") {
    transitions.push({ status: "open", label: "Reopen" });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
      {transitions.map((t) => (
        <form key={t.status} action={updateBacklogStatusAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value={t.status} />
          <button
            type="submit"
            className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-1 rounded border hairline-strong hover:bg-bg-3 transition-colors"
          >
            {t.label}
          </button>
        </form>
      ))}
      <form action={deleteBacklogItemAction}>
        <input type="hidden" name="id" value={item.id} />
        <button
          type="submit"
          className="text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-1 rounded text-fg-faint hover:text-red-400 transition-colors"
          aria-label="Slet"
        >
          ×
        </button>
      </form>
    </div>
  );
}

function StatusDot({ status }: { status: BacklogStatus }) {
  const cls = {
    open: "bg-yellow-400",
    in_progress: "bg-blue-400 animate-pulse",
    done: "bg-green-400/60",
    wontfix: "bg-fg-faint",
  }[status];
  return <span className={`size-2 rounded-full ${cls}`} aria-hidden />;
}

function KindBadge({ kind }: { kind: "feature" | "change" | "fix" }) {
  const cls = {
    feature: "bg-blue-400/15 text-blue-400",
    change: "bg-purple-400/15 text-purple-400",
    fix: "bg-amber-400/15 text-amber-400",
  }[kind];
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.14em] ${cls}`}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: BacklogPriority }) {
  if (priority === "medium" || priority === "low") {
    // Avoid badge spam on the common case — only highlight elevated priorities.
    return (
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
        {PRIORITY_LABEL[priority]}
      </span>
    );
  }
  const cls = {
    high: "bg-orange-400/15 text-orange-400",
    critical: "bg-red-400/15 text-red-400",
  }[priority];
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.14em] ${cls}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
