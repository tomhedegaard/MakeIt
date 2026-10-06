"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Switch from "@/components/ui/Switch";
import SectionHeader from "@/components/ui/SectionHeader";
import { saveBodyAction, type BodyError } from "@/app/(app)/settings/body-actions";
import type { MemberBody } from "@/lib/data/body";
import type { Sex } from "@/lib/health/body-rules";

/**
 * Krop (spec 2026-09-27 §S): whether the weight card shows, whether
 * numbers show at all, and the pejlemærke with the body data its limits
 * need. A direction, never a target: no countdown, no "kg to go".
 */
export default function BodySettingsSection({
  body,
  adultConfirmed,
}: {
  body: MemberBody;
  adultConfirmed: boolean;
}) {
  const t = useTranslations("Settings.body");
  const tc = useTranslations("Common");
  const router = useRouter();
  const [showWeightCard, setShowWeightCard] = useState(body.showWeightCard);
  const [hideNumbers, setHideNumbers] = useState(body.hideNumbers);
  const [height, setHeight] = useState(body.heightCm?.toString() ?? "");
  const [birthYear, setBirthYear] = useState(body.birthYear?.toString() ?? "");
  const [sex, setSex] = useState<Sex | "">(body.sex ?? "");
  const [pejlemaerke, setPejlemaerke] = useState(body.pejlemaerkeKg?.toString().replace(".", ",") ?? "");
  const [adult, setAdult] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const weightId = useId();
  const hideId = useId();

  const num = (s: string) => {
    const n = Number.parseFloat(s.replace(",", "."));
    return s.trim() === "" || !Number.isFinite(n) ? null : n;
  };

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveBodyAction({
        heightCm: num(height),
        birthYear: num(birthYear),
        sex: sex || null,
        pejlemaerkeKg: num(pejlemaerke),
        showWeightCard,
        hideNumbers,
        confirmAdult: adult,
      });
      if (res.ok) {
        setMsg({ ok: true, text: tc("saved") });
        router.refresh();
      } else {
        setMsg({ ok: false, text: t(`errors.${res.error satisfies BodyError}`) });
      }
    });
  }

  return (
    <section className="surface-2 rounded-2xl p-5 lg:p-7 space-y-4" data-settings="body">
      <SectionHeader title={t("title")} />
      <div className="text-meta text-fg-dim max-w-prose">{t("intro")}</div>

      <ul className="divide-y hairline">
        <li className="py-3 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div id={hideId} className="text-meta">{t("hideNumbersLabel")}</div>
            <div className="text-meta text-fg-dim mt-0.5">{t("hideNumbersSub")}</div>
          </div>
          <Switch checked={hideNumbers} onCheckedChange={setHideNumbers} labelledBy={hideId} />
        </li>
        <li className="py-3 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div id={weightId} className="text-meta">{t("showWeightCardLabel")}</div>
            <div className="text-meta text-fg-dim mt-0.5">{t("showWeightCardSub")}</div>
          </div>
          <Switch checked={showWeightCard} onCheckedChange={setShowWeightCard} labelledBy={weightId} />
        </li>
      </ul>

      <div className="space-y-1">
        <div className="text-meta">{t("pejlemaerkeTitle")}</div>
        <div className="text-meta text-fg-dim max-w-prose">{t("pejlemaerkeSub")}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-micro text-fg-dim">{t("pejlemaerkeLabel")}</span>
          <input className="field" inputMode="decimal" value={pejlemaerke} onChange={(e) => setPejlemaerke(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="text-micro text-fg-dim">{t("heightLabel")}</span>
          <input className="field" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="text-micro text-fg-dim">{t("birthYearLabel")}</span>
          <input className="field" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
        </label>
        <label className="space-y-1.5">
          <span className="text-micro text-fg-dim">{t("sexLabel")}</span>
          <select className="input w-full" value={sex} onChange={(e) => setSex(e.target.value as Sex | "")}>
            <option value="">{t("sex.none")}</option>
            <option value="f">{t("sex.f")}</option>
            <option value="m">{t("sex.m")}</option>
            <option value="unspecified">{t("sex.unspecified")}</option>
          </select>
        </label>
      </div>
      <div className="text-micro text-fg-dim max-w-prose">{t("why")}</div>

      {!adultConfirmed ? (
        <label className="flex items-start gap-3 text-meta">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1" />
          <span>{t("adultLabel")}</span>
        </label>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={pending}>
          {pending ? tc("saving") : t("save")}
        </button>
        {msg ? (
          <span role="status" className={msg.ok ? "text-micro text-fg" : "text-micro text-fg-dim"}>
            {msg.text}
          </span>
        ) : null}
      </div>
    </section>
  );
}
