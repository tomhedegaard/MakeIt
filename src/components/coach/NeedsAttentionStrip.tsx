import Link from "next/link";
import type { NeedsAttentionModel, NeedsBucketId } from "@/lib/coach/needs-attention";

export type NeedsAttentionCopy = {
  eyebrow: string;
  title: string;
  buckets: Record<NeedsBucketId, { label: string; empty: string }>;
  open: string;
};

const ORDER: NeedsBucketId[] = ["sprunget", "afventer_form", "engine"];

const KEY: Record<NeedsBucketId, keyof NeedsAttentionModel> = {
  sprunget: "sprunget",
  afventer_form: "afventerForm",
  engine: "engine",
};

/**
 * Coach-only strip. Three quiet buckets. Monochrome.
 * Deep-links into members / queue. No compliance or churn %.
 */
export default function NeedsAttentionStrip({
  model,
  copy,
}: {
  model: NeedsAttentionModel;
  copy: NeedsAttentionCopy;
}) {
  return (
    <section
      data-needs-attention=""
      className="surface-2 rounded-2xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b hairline">
        <div className="eyebrow mb-1">{copy.eyebrow}</div>
        <h2 className="font-display text-2xl">{copy.title}</h2>
      </div>

      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x hairline">
        {ORDER.map((bucket) => {
          const rows = model[KEY[bucket]];
          return (
            <div
              key={bucket}
              data-needs-bucket={bucket}
              className="p-5 space-y-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="eyebrow">{copy.buckets[bucket].label}</div>
                <span className="numeric text-xs text-fg-faint">{rows.length}</span>
              </div>

              {rows.length === 0 ? (
                <p
                  data-needs-empty={bucket}
                  className="text-sm text-fg-faint"
                >
                  {copy.buckets[bucket].empty}
                </p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        data-needs-row={row.id}
                        className="block lift touch-app -mx-1 px-1 py-1"
                      >
                        <div className="text-sm">@{row.memberHandle}</div>
                        <div className="text-[11px] font-mono text-fg-faint truncate">
                          {row.lift ? `${row.lift} · ${row.detail}` : row.detail}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
