/**
 * Backlog data access — reads + types for the admin-only roadmap
 * surface on /coach/system. All callers are admin-gated at the
 * page level; this module also assumes RLS is doing its job.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type BacklogKind = "feature" | "change" | "fix";
export type BacklogStatus = "open" | "in_progress" | "done" | "wontfix";
export type BacklogPriority = "low" | "medium" | "high" | "critical";

export type BacklogItem = {
  id: string;
  kind: BacklogKind;
  title: string;
  description: string | null;
  priority: BacklogPriority;
  status: BacklogStatus;
  createdAt: string;
  createdBy: string | null;
  createdByHandle: string | null;
  updatedAt: string;
  completedAt: string | null;
};

export const KIND_LABEL: Record<BacklogKind, string> = {
  feature: "Feature",
  change: "Change",
  fix: "Fix",
};

export const STATUS_LABEL: Record<BacklogStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  wontfix: "Won't fix",
};

export const PRIORITY_LABEL: Record<BacklogPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/** Sort order for stable grouping in the UI. */
const STATUS_ORDER: BacklogStatus[] = [
  "in_progress",
  "open",
  "done",
  "wontfix",
];

const PRIORITY_RANK: Record<BacklogPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function listBacklog(): Promise<BacklogItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("backlog_items")
    .select(`
      id, kind, title, description, priority, status,
      created_at, created_by, updated_at, completed_at,
      creator:created_by ( handle )
    `)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  type Row = {
    id: string;
    kind: BacklogKind;
    title: string;
    description: string | null;
    priority: BacklogPriority;
    status: BacklogStatus;
    created_at: string;
    created_by: string | null;
    updated_at: string;
    completed_at: string | null;
    creator: { handle: string } | { handle: string }[] | null;
  };

  return (data as Row[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    description: r.description,
    priority: r.priority,
    status: r.status,
    createdAt: r.created_at,
    createdBy: r.created_by,
    createdByHandle: Array.isArray(r.creator)
      ? r.creator[0]?.handle ?? null
      : r.creator?.handle ?? null,
    updatedAt: r.updated_at,
    completedAt: r.completed_at,
  }));
}

/** Pre-grouped + sorted for the UI: by status (active first), then priority, then date. */
export function groupBacklog(items: BacklogItem[]): {
  status: BacklogStatus;
  label: string;
  items: BacklogItem[];
}[] {
  const grouped = new Map<BacklogStatus, BacklogItem[]>();
  for (const s of STATUS_ORDER) grouped.set(s, []);
  for (const item of items) {
    const bucket = grouped.get(item.status);
    if (bucket) bucket.push(item);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => {
      const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (p !== 0) return p;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }
  return STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABEL[status],
    items: grouped.get(status) ?? [],
  }));
}
