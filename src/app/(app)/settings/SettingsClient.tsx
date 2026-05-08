"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfileAction,
  updateNotifPrefsAction,
  deleteAccountAction,
} from "./actions";
import type { MemberSettings } from "@/lib/data/settings";

const ERROR_LABELS: Record<string, string> = {
  handle_invalid: "Handle skal starte med et bogstav (a-z) og være 2-31 tegn (a-z, 0-9, _, ., -).",
  handle_taken: "Handle er allerede taget — prøv et andet.",
  auth: "Du er ikke logget ind.",
  unknown: "Noget gik galt — prøv igen.",
  service_key_missing: "Konto-sletning kræver server-konfiguration der ikke er sat op.",
};

export default function SettingsClient({ settings }: { settings: MemberSettings }) {
  const router = useRouter();

  /* Profile */
  const [handle, setHandle] = useState(settings.handle);
  const [displayName, setDisplayName] = useState(settings.displayName ?? "");
  const [bio, setBio] = useState(settings.bio ?? "");
  const [profilePending, startProfile] = useTransition();
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  /* Notif prefs */
  const [prefs, setPrefs] = useState({
    notifFormCheckReview: settings.notifFormCheckReview,
    notifMention: settings.notifMention,
    notifDigest: settings.notifDigest,
    notifTierUp: settings.notifTierUp,
  });
  const [prefsPending, startPrefs] = useTransition();
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);

  /* Delete */
  const [deletePending, startDelete] = useTransition();
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  function saveProfile() {
    setProfileMsg(null);
    startProfile(async () => {
      const res = await updateProfileAction({ handle, displayName, bio });
      if (res.ok) {
        setProfileMsg("✓ Gemt");
        router.refresh();
        window.setTimeout(() => setProfileMsg(null), 2200);
      } else {
        setProfileMsg(ERROR_LABELS[res.error ?? "unknown"]);
      }
    });
  }

  function savePrefs() {
    setPrefsMsg(null);
    startPrefs(async () => {
      const res = await updateNotifPrefsAction(prefs);
      if (res.ok) {
        setPrefsMsg("✓ Gemt");
        window.setTimeout(() => setPrefsMsg(null), 2200);
      } else {
        setPrefsMsg("Kunne ikke gemme — prøv igen.");
      }
    });
  }

  function confirmDelete() {
    const phrase = "SLET MIN KONTO";
    const typed = window.prompt(
      `Dette kan ikke fortrydes. Alle dine sessioner, posts, Reps og form-checks slettes permanent.\n\nSkriv "${phrase}" for at bekræfte:`
    );
    if (typed !== phrase) return;
    setDeleteMsg(null);
    startDelete(async () => {
      const res = await deleteAccountAction();
      if (!res.ok) {
        setDeleteMsg(ERROR_LABELS[res.error ?? "unknown"]);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <section className="surface-2 rounded-2xl p-5 lg:p-7 space-y-4">
        <div>
          <div className="eyebrow mb-1">Profil</div>
          <h2 className="font-display text-2xl">Hvordan crewet ser dig</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Handle">
            <div className="flex items-center gap-2">
              <span className="text-fg-dim font-mono">@</span>
              <input
                className="field flex-1"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="munk"
                spellCheck={false}
              />
            </div>
          </Field>
          <Field label="Display navn">
            <input
              className="field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Mikael Munk"
              maxLength={100}
            />
          </Field>
        </div>
        <Field label="Bio">
          <textarea
            className="field min-h-[80px] py-3 resize-none"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Hvad løfter du for? Hvor er du på rejsen?"
            maxLength={500}
          />
        </Field>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={saveProfile}
            disabled={profilePending}
          >
            {profilePending ? "Gemmer…" : "Gem profil"}
          </button>
          {profileMsg ? (
            <span
              className="text-[10px] font-mono uppercase tracking-[0.16em]"
              style={{ color: profileMsg.startsWith("✓") ? "var(--fg)" : "var(--fg-dim)" }}
            >
              {profileMsg}
            </span>
          ) : null}
        </div>
      </section>

      {/* Notifications */}
      <section className="surface-2 rounded-2xl p-5 lg:p-7 space-y-4">
        <div>
          <div className="eyebrow mb-1">Notifikationer</div>
          <h2 className="font-display text-2xl">Hvornår vi må skrive til dig</h2>
        </div>
        <ul className="divide-y hairline">
          <Toggle
            label="Coach-noter på dine form-checks"
            sub="Mail når Mikael har gennemgået og skrevet en note."
            checked={prefs.notifFormCheckReview}
            onChange={(v) => setPrefs((p) => ({ ...p, notifFormCheckReview: v }))}
          />
          <Toggle
            label="@mentions"
            sub="Mail når et crew-medlem nævner dig i en kommentar."
            checked={prefs.notifMention}
            onChange={(v) => setPrefs((p) => ({ ...p, notifMention: v }))}
          />
          <Toggle
            label="Ugentlig digest"
            sub="Mandag morgen — top PR'er, nye medlemmer, månedens challenge."
            checked={prefs.notifDigest}
            onChange={(v) => setPrefs((p) => ({ ...p, notifDigest: v }))}
          />
          <Toggle
            label="Tier-up notifikationer"
            sub="Når du krydser fra Lifter → Athlete → Beast → Legend."
            checked={prefs.notifTierUp}
            onChange={(v) => setPrefs((p) => ({ ...p, notifTierUp: v }))}
          />
        </ul>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={savePrefs}
            disabled={prefsPending}
          >
            {prefsPending ? "Gemmer…" : "Gem præferencer"}
          </button>
          {prefsMsg ? (
            <span
              className="text-[10px] font-mono uppercase tracking-[0.16em]"
              style={{ color: prefsMsg.startsWith("✓") ? "var(--fg)" : "var(--fg-dim)" }}
            >
              {prefsMsg}
            </span>
          ) : null}
        </div>
      </section>

      {/* Account info — read-only */}
      <section className="surface-2 rounded-2xl p-5 lg:p-7">
        <div className="mb-4">
          <div className="eyebrow mb-1">Konto</div>
          <h2 className="font-display text-2xl">Bagved kulissen</h2>
        </div>
        <ul className="space-y-3 text-sm">
          <Row k="Email" v={settings.email ?? "—"} />
          <Row k="Tier" v={settings.tier} />
          <Row
            k="Medlem siden"
            v={new Date(settings.joinedAt).toLocaleDateString("da-DK", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </ul>
      </section>

      {/* Data export */}
      <section className="surface-2 rounded-2xl p-5 lg:p-7">
        <div className="mb-4">
          <div className="eyebrow mb-1">Data</div>
          <h2 className="font-display text-2xl">Eksportér alt vi har om dig</h2>
        </div>
        <p className="text-fg-dim text-sm mb-4 max-w-md">
          Download en JSON-fil med din profil, dine sessioner og logs, dine posts
          og kommentarer, dine Reps-transaktioner og form-checks. GDPR Art. 20.
        </p>
        <a
          href="/api/settings/export"
          className="btn btn-sm"
          download="makeit-hq-export.json"
        >
          Eksportér mine data ↓
        </a>
      </section>

      {/* Danger zone */}
      <section
        className="surface-2 rounded-2xl p-5 lg:p-7"
        style={{ borderColor: "var(--line-bright)" }}
      >
        <div className="mb-4">
          <div className="eyebrow mb-1">Danger zone</div>
          <h2 className="font-display text-2xl">Slet din konto</h2>
        </div>
        <p className="text-fg-dim text-sm mb-4 max-w-md">
          Permanent og uigenkaldelig. Alle sessioner, posts, Reps og form-checks
          slettes. Eventuelt aktivt Stripe-abonnement skal opsiges separat fra
          billing-siden inden.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-sm"
            onClick={confirmDelete}
            disabled={deletePending}
          >
            {deletePending ? "Sletter…" : "Slet min konto"}
          </button>
          {deleteMsg ? (
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-dim">
              {deleteMsg}
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-center justify-between border-b hairline pb-3 last:border-0 last:pb-0">
      <span className="text-fg-dim">{k}</span>
      <span className="numeric">{v}</span>
    </li>
  );
}

function Toggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="py-3 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm">{label}</div>
        <div className="text-xs text-fg-dim mt-0.5">{sub}</div>
      </div>
      <label className="shrink-0 cursor-pointer touch-app">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span
          aria-hidden
          className="block relative w-12 h-7 rounded-full border hairline-strong transition-colors peer-checked:bg-fg peer-checked:border-fg"
          style={{ background: checked ? "var(--fg)" : "var(--bg-3)" }}
        >
          <span
            className="absolute top-0.5 left-0.5 size-6 rounded-full transition-transform"
            style={{
              background: checked ? "var(--bg)" : "var(--fg-dim)",
              transform: checked ? "translateX(20px)" : "translateX(0)",
            }}
          />
        </span>
      </label>
    </li>
  );
}
