"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  updateProfileAction,
  updateNotifPrefsAction,
  deleteAccountAction,
} from "./actions";
import type { MemberSettings, HrvSettings } from "@/lib/data/settings";
import PushToggle from "@/components/push/PushToggle";
import LanguageSelector from "@/components/LanguageSelector";
import HrvSettingsSection from "@/components/hrv/HrvSettingsSection";

type Status = { ok: boolean; text: string } | null;

export default function SettingsClient({
  settings,
  hrv,
  vapidPublicKey,
}: {
  settings: MemberSettings;
  hrv: HrvSettings;
  vapidPublicKey: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Settings");
  const tc = useTranslations("Common");
  const tl = useTranslations("Language");

  function errorText(code: string | undefined) {
    const key = `errors.${code ?? "unknown"}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  /* Profile */
  const [handle, setHandle] = useState(settings.handle);
  const [displayName, setDisplayName] = useState(settings.displayName ?? "");
  const [bio, setBio] = useState(settings.bio ?? "");
  const [profilePending, startProfile] = useTransition();
  const [profileMsg, setProfileMsg] = useState<Status>(null);

  /* Notif prefs */
  const [prefs, setPrefs] = useState({
    notifFormCheckReview: settings.notifFormCheckReview,
    notifMention: settings.notifMention,
    notifDigest: settings.notifDigest,
    notifTierUp: settings.notifTierUp,
  });
  const [prefsPending, startPrefs] = useTransition();
  const [prefsMsg, setPrefsMsg] = useState<Status>(null);

  /* Delete */
  const [deletePending, startDelete] = useTransition();
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  function saveProfile() {
    setProfileMsg(null);
    startProfile(async () => {
      const res = await updateProfileAction({ handle, displayName, bio });
      if (res.ok) {
        setProfileMsg({ ok: true, text: tc("saved") });
        router.refresh();
        window.setTimeout(() => setProfileMsg(null), 2200);
      } else {
        setProfileMsg({ ok: false, text: errorText(res.error) });
      }
    });
  }

  function savePrefs() {
    setPrefsMsg(null);
    startPrefs(async () => {
      const res = await updateNotifPrefsAction(prefs);
      if (res.ok) {
        setPrefsMsg({ ok: true, text: tc("saved") });
        window.setTimeout(() => setPrefsMsg(null), 2200);
      } else {
        setPrefsMsg({ ok: false, text: t("errors.prefs_save") });
      }
    });
  }

  function confirmDelete() {
    const phrase = t("danger.confirmPhrase");
    const typed = window.prompt(t("danger.confirmPrompt", { phrase }));
    if (typed !== phrase) return;
    setDeleteMsg(null);
    startDelete(async () => {
      const res = await deleteAccountAction();
      if (!res.ok) {
        setDeleteMsg(errorText(res.error));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Language */}
      <section className="surface-2 rounded-2xl p-5 lg:p-7 space-y-4">
        <div>
          <div className="eyebrow mb-1">{tl("eyebrow")}</div>
          <h2 className="font-display text-2xl">{tl("title")}</h2>
        </div>
        <p className="text-fg-dim text-sm max-w-md">{tl("description")}</p>
        <LanguageSelector />
      </section>

      {/* Profile */}
      <section className="surface-2 rounded-2xl p-5 lg:p-7 space-y-4">
        <div>
          <div className="eyebrow mb-1">{t("profile.eyebrow")}</div>
          <h2 className="font-display text-2xl">{t("profile.title")}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={t("profile.handleLabel")}>
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
          <Field label={t("profile.displayNameLabel")}>
            <input
              className="field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("profile.displayNamePlaceholder")}
              maxLength={100}
            />
          </Field>
        </div>
        <Field label={t("profile.bioLabel")}>
          <textarea
            className="field min-h-[80px] py-3 resize-none"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("profile.bioPlaceholder")}
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
            {profilePending ? tc("saving") : t("profile.save")}
          </button>
          <StatusLabel status={profileMsg} />
        </div>
      </section>

      {/* Notifications */}
      <section className="surface-2 rounded-2xl p-5 lg:p-7 space-y-4">
        <div>
          <div className="eyebrow mb-1">{t("notifications.eyebrow")}</div>
          <h2 className="font-display text-2xl">{t("notifications.title")}</h2>
        </div>
        <div className="rounded-xl border hairline px-4 py-3 flex items-start gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">
              {t("notifications.pushTitle")}
            </div>
            <div className="text-xs text-fg-dim leading-relaxed">
              {t("notifications.pushDescription")}
            </div>
          </div>
          <PushToggle vapidPublicKey={vapidPublicKey} />
        </div>
        <ul className="divide-y hairline">
          <Toggle
            label={t("notifications.formCheckLabel")}
            sub={t("notifications.formCheckSub")}
            checked={prefs.notifFormCheckReview}
            onChange={(v) => setPrefs((p) => ({ ...p, notifFormCheckReview: v }))}
          />
          <Toggle
            label={t("notifications.mentionLabel")}
            sub={t("notifications.mentionSub")}
            checked={prefs.notifMention}
            onChange={(v) => setPrefs((p) => ({ ...p, notifMention: v }))}
          />
          <Toggle
            label={t("notifications.digestLabel")}
            sub={t("notifications.digestSub")}
            checked={prefs.notifDigest}
            onChange={(v) => setPrefs((p) => ({ ...p, notifDigest: v }))}
          />
          <Toggle
            label={t("notifications.tierUpLabel")}
            sub={t("notifications.tierUpSub")}
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
            {prefsPending ? tc("saving") : t("notifications.save")}
          </button>
          <StatusLabel status={prefsMsg} />
        </div>
      </section>

      {/* HRV */}
      <HrvSettingsSection hrv={hrv} />

      {/* Account info — read-only */}
      <section className="surface-2 rounded-2xl p-5 lg:p-7">
        <div className="mb-4">
          <div className="eyebrow mb-1">{t("account.eyebrow")}</div>
          <h2 className="font-display text-2xl">{t("account.title")}</h2>
        </div>
        <ul className="space-y-3 text-sm">
          <Row k={t("account.email")} v={settings.email ?? "—"} />
          <Row k={t("account.tier")} v={settings.tier} />
          <Row
            k={t("account.memberSince")}
            v={new Date(settings.joinedAt).toLocaleDateString(
              locale === "da" ? "da-DK" : "en-GB",
              { day: "numeric", month: "long", year: "numeric" }
            )}
          />
        </ul>
      </section>

      {/* Data export */}
      <section className="surface-2 rounded-2xl p-5 lg:p-7">
        <div className="mb-4">
          <div className="eyebrow mb-1">{t("data.eyebrow")}</div>
          <h2 className="font-display text-2xl">{t("data.title")}</h2>
        </div>
        <p className="text-fg-dim text-sm mb-4 max-w-md">
          {t("data.description")}
        </p>
        <a
          href="/api/settings/export"
          className="btn btn-sm"
          download="makeit-hq-export.json"
        >
          {t("data.export")}
        </a>
      </section>

      {/* Danger zone */}
      <section
        className="surface-2 rounded-2xl p-5 lg:p-7"
        style={{ borderColor: "var(--line-bright)" }}
      >
        <div className="mb-4">
          <div className="eyebrow mb-1">{t("danger.eyebrow")}</div>
          <h2 className="font-display text-2xl">{t("danger.title")}</h2>
        </div>
        <p className="text-fg-dim text-sm mb-4 max-w-md">
          {t("danger.description")}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-sm"
            onClick={confirmDelete}
            disabled={deletePending}
          >
            {deletePending ? t("danger.deleting") : t("danger.delete")}
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

function StatusLabel({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <span
      className="text-[10px] font-mono uppercase tracking-[0.16em]"
      style={{ color: status.ok ? "var(--fg)" : "var(--fg-dim)" }}
    >
      {status.text}
    </span>
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
