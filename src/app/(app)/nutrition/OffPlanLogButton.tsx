"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, PenLine, SquarePen } from "lucide-react";
import {
  estimateMealAction,
  identifyMealAction,
  logEstimatedMealAction,
  logOffPlanAction,
} from "./actions";
import StreakCelebration from "@/components/nutrition/StreakCelebration";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { ICON } from "@/components/ui/icon";
import {
  PORTIONS,
  roundKcal,
  scaleEstimate,
  type MealEstimate,
  type MealQuestion,
} from "@/lib/data/nutrition-estimate";
import { downscaleImage } from "@/lib/ui/downscale-image";
import { cn } from "@/lib/utils";

/**
 * "Spiste noget andet" (spec 2026-09-27 del A).
 *
 * With the HQ estimate on: photo or text → HQ asks only if it is unsure
 * (the photo with a numbered marker) → HQ shows the estimate with its
 * interval and confidence → nothing counts until the member approves or
 * edits. Any failure, the daily cap or the feature being off falls back
 * to the manual kcal + protein fields, so logging is never blocked.
 *
 * Health rules (spec §S): the sheet describes, never judges. No score,
 * no "remaining", no red, no advice.
 */
type Step = "choose" | "photo" | "text" | "working" | "questions" | "noFood" | "review" | "edit" | "manual";
type Notice = "limited" | "unavailable" | "photoTooBig" | null;

export default function OffPlanLogButton({ estimateEnabled = false }: { estimateEnabled?: boolean }) {
  const t = useTranslations("Nutrition.offPlan");
  const locale = useLocale();
  const nf = useMemo(() => new Intl.NumberFormat(locale === "da" ? "da-DK" : "en-GB"), [locale]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(estimateEnabled ? "choose" : "manual");
  const [notice, setNotice] = useState<Notice>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [questions, setQuestions] = useState<MealQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [portion, setPortion] = useState<number>(1);
  const [pending, startTransition] = useTransition();
  const [celebration, setCelebration] = useState<number | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  function reset() {
    setStep(estimateEnabled ? "choose" : "manual");
    setNotice(null);
    setPhoto(null);
    setPhotoUrl(null);
    setText("");
    setQuestions([]);
    setAnswers({});
    setEstimate(null);
    setPortion(1);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function fallback(n: Notice) {
    setNotice(n);
    setStep("manual");
  }

  function inputForm(): FormData {
    const fd = new FormData();
    if (photo) fd.set("photo", photo);
    if (text.trim()) fd.set("text", text.trim());
    return fd;
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    const small = await downscaleImage(file);
    if (!small) return fallback("photoTooBig");
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(small);
    setPhotoUrl(URL.createObjectURL(small));
    setStep("photo");
  }

  function runEstimate(given: Record<string, string>) {
    setStep("working");
    const fd = inputForm();
    fd.set(
      "answers",
      JSON.stringify(questions.filter((q) => given[q.id]?.trim()).map((q) => ({ prompt: q.prompt, answer: given[q.id].trim() }))),
    );
    startTransition(async () => {
      const res = await estimateMealAction(fd);
      if (res.status === "ok") {
        setEstimate(res.estimate);
        setPortion(1);
        setStep("review");
      } else fallback(res.status);
    });
  }

  function runIdentify() {
    setStep("working");
    startTransition(async () => {
      const res = await identifyMealAction(inputForm());
      if (res.status === "ok") {
        if (res.result.questions.length > 0) {
          setQuestions(res.result.questions);
          setStep("questions");
        } else {
          runEstimate({});
        }
      } else if (res.status === "no_food") setStep("noFood");
      else fallback(res.status);
    });
  }

  const shown = estimate ? scaleEstimate(estimate, portion) : null;

  function save(values: { kcal: number; proteinG: number; carbsG: number; fatG: number }, edited: boolean) {
    if (!shown) return;
    const fd = new FormData();
    fd.set(
      "approved",
      JSON.stringify({
        source: photo ? "hq_photo" : "hq_text",
        label: text.trim() || null,
        ...values,
        confidence: shown.confidence,
        kcalLow: shown.kcalRange.low,
        kcalHigh: shown.kcalRange.high,
        items: shown.items,
        edited,
      }),
    );
    if (photo) fd.set("photo", photo);
    startTransition(async () => {
      const res = await logEstimatedMealAction(fd);
      if (!res.ok) return fallback("unavailable");
      onOpenChange(false);
      if (res.streakMilestone) setCelebration(res.streakMilestone);
    });
  }

  function saveManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await logOffPlanAction(fd);
      onOpenChange(false);
      if (res?.streakMilestone) setCelebration(res.streakMilestone);
    });
  }

  const kcalLine = (e: MealEstimate) => (
    <>
      {t("kcalAbout", { kcal: nf.format(roundKcal(e.totals.kcal)) })}{" "}
      <span className="text-fg-dim">
        {t("kcalRange", { low: nf.format(roundKcal(e.kcalRange.low)), high: nf.format(roundKcal(e.kcalRange.high)) })}
      </span>
    </>
  );

  return (
    <>
      {/* Desktop — inline header button */}
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost btn-sm hidden lg:inline-flex">
        {t("trigger")}
      </button>

      {/* Mobile — floating action button, parked above the tab-bar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("dialogLabel")}
        className="lg:hidden fixed right-4 z-40 btn btn-primary"
        style={{ bottom: "calc(var(--tabbar-stack) + 16px)" }}
      >
        {t("triggerMobile")}
      </button>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent title={t("title")} description={estimateEnabled ? t("intro") : t("introManual")}>
          <div data-offplan-step={step} className="space-y-5">
            {notice ? (
              <p role="status" className="border hairline bg-bg-3 px-4 py-3 text-meta text-fg-body">
                {t(notice)}
              </p>
            ) : null}

            {step === "choose" ? (
              <div className="grid gap-2">
                <button type="button" className="btn btn-primary justify-start" onClick={() => photoInput.current?.click()}>
                  <Camera {...ICON} className="size-5" />
                  {t("choosePhoto")}
                </button>
                <button type="button" className="btn justify-start" onClick={() => setStep("text")}>
                  <PenLine {...ICON} className="size-5" />
                  {t("chooseText")}
                </button>
                <button type="button" className="btn btn-ghost justify-start" onClick={() => setStep("manual")}>
                  <SquarePen {...ICON} className="size-5" />
                  {t("chooseManual")}
                </button>
              </div>
            ) : null}

            {/* One hidden camera input serves "Tag foto" and "Tag nyt foto". */}
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                void pickPhoto(e.currentTarget.files?.[0]);
                e.currentTarget.value = "";
              }}
            />

            {step === "photo" && photoUrl ? (
              <div className="space-y-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                <img src={photoUrl} alt="" className="block max-h-72 w-full object-cover" />
                <label className="block space-y-1.5">
                  <span className="text-meta">{t("photoNoteLabel")}</span>
                  <input
                    type="text"
                    value={text}
                    maxLength={200}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("photoNotePlaceholder")}
                    className="input w-full"
                  />
                </label>
                <button type="button" className="btn btn-primary w-full" onClick={runIdentify}>
                  {t("textSubmit")}
                </button>
              </div>
            ) : null}

            {step === "text" ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (text.trim()) runIdentify();
                }}
              >
                <label className="block space-y-1.5">
                  <span className="text-meta">{t("textLabel")}</span>
                  <textarea
                    value={text}
                    maxLength={500}
                    required
                    autoFocus
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("textPlaceholder")}
                    className="input w-full"
                  />
                </label>
                <button type="submit" className="btn btn-primary w-full">
                  {t("textSubmit")}
                </button>
              </form>
            ) : null}

            {step === "working" ? (
              <p role="status" aria-live="polite" className="py-6 text-copy text-fg-dim">
                {t("working")}
              </p>
            ) : null}

            {step === "noFood" ? (
              <div className="space-y-3">
                <h3 className="font-display text-section">{t("noFoodTitle")}</h3>
                <p className="text-copy text-fg-body">{t("noFoodBody")}</p>
                <div className="grid gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => photoInput.current?.click()}>
                    {t("retakePhoto")}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoUrl(null);
                      setStep("text");
                    }}
                  >
                    {t("chooseText")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === "questions" ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-section">{t("questionsTitle")}</h3>
                  <p className="mt-1 text-meta text-fg-dim">{t("questionsIntro")}</p>
                </div>
                {photoUrl ? <MarkedPhoto src={photoUrl} questions={questions} /> : null}
                <ol className="space-y-4">
                  {questions.map((q, i) => (
                    <li key={q.id} className="space-y-2">
                      <p className="flex items-start gap-2 text-copy">
                        <span className="inline-flex size-6 shrink-0 items-center justify-center bg-fg text-micro text-bg">
                          {i + 1}
                        </span>
                        <span>
                          {q.prompt}
                          {!q.box && q.where ? <span className="text-fg-dim"> ({q.where})</span> : null}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((o) => (
                          <button
                            key={o}
                            type="button"
                            aria-pressed={answers[q.id] === o}
                            onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                            className={cn(
                              "border px-2.5 py-1.5 text-micro",
                              answers[q.id] === o ? "border-fg bg-fg text-bg" : "border-line-strong text-fg",
                            )}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        maxLength={120}
                        aria-label={`${t("questionOther")}: ${q.prompt}`}
                        placeholder={t("questionOtherPlaceholder")}
                        value={q.options.includes(answers[q.id] ?? "") ? "" : (answers[q.id] ?? "")}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        className="input w-full"
                      />
                    </li>
                  ))}
                </ol>
                <button type="button" className="btn btn-primary w-full" onClick={() => runEstimate(answers)}>
                  {t("questionsContinue")}
                </button>
              </div>
            ) : null}

            {step === "review" && shown ? (
              <div className="space-y-5" data-hq-estimate="">
                <div className="space-y-1">
                  <p className="eyebrow">{t("estimateLabel")}</p>
                  <p className="text-copy text-fg-body">{shown.assumption}</p>
                </div>

                <div>
                  <p className="font-display text-title tabular-nums">{kcalLine(shown)}</p>
                  <dl className="mt-3 grid grid-cols-3 gap-2">
                    {(
                      [
                        ["protein", shown.totals.proteinG],
                        ["carbs", shown.totals.carbsG],
                        ["fat", shown.totals.fatG],
                      ] as const
                    ).map(([k, g]) => (
                      <div key={k} className="border hairline px-3 py-2">
                        <dt className="text-micro text-fg-dim">{t(k)}</dt>
                        <dd className="text-card tabular-nums">{t("grams", { g: nf.format(g) })}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <p className="text-meta">
                  <span className="font-medium">{t(`confidence.${shown.confidence}`)}</span>
                  <span className="text-fg-dim"> · {shown.confidenceReason}</span>
                </p>

                <fieldset className="space-y-2">
                  <legend className="text-meta text-fg-dim">{t("portion")}</legend>
                  <div className="pillgroup">
                    {PORTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="pill"
                        data-active={portion === p}
                        aria-pressed={portion === p}
                        aria-label={t("portionAria", { value: nf.format(p) })}
                        onClick={() => setPortion(p)}
                      >
                        {portionLabel(p)}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <details className="group">
                  <summary className="cursor-pointer list-none text-meta text-signal hover:underline">
                    {t("itemsTitle")} ({shown.items.length})
                  </summary>
                  <ul className="mt-2 divide-y">
                    {shown.items.map((i) => (
                      <li key={i.name} className="flex items-baseline justify-between gap-3 py-2 text-meta">
                        <span className="min-w-0">
                          {i.name} <span className="text-fg-dim">{t("grams", { g: nf.format(i.grams) })}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-fg-dim">
                          {nf.format(i.kcal)} {t("kcalUnit")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>

                <div className="grid gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    className="btn btn-primary w-full whitespace-normal"
                    onClick={() => save(shown.totals, false)}
                  >
                    {t("approve", {
                      kcal: nf.format(roundKcal(shown.totals.kcal)),
                      low: nf.format(roundKcal(shown.kcalRange.low)),
                      high: nf.format(roundKcal(shown.kcalRange.high)),
                    })}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="btn" onClick={() => setStep("edit")}>
                      {t("edit")}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => onOpenChange(false)}>
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === "edit" && shown ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const n = (k: string) => Math.max(0, Math.round(Number(fd.get(k) ?? 0)));
                  const values = { kcal: n("kcal"), proteinG: n("proteinG"), carbsG: n("carbsG"), fatG: n("fatG") };
                  if (values.kcal < 1) return;
                  const edited =
                    values.kcal !== shown.totals.kcal ||
                    values.proteinG !== shown.totals.proteinG ||
                    values.carbsG !== shown.totals.carbsG ||
                    values.fatG !== shown.totals.fatG;
                  save(values, edited);
                }}
              >
                <h3 className="font-display text-section">{t("editTitle")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField name="kcal" label={t("kcal")} unit={t("kcalUnit")} value={shown.totals.kcal} max={10000} min={1} />
                  <NumberField name="proteinG" label={t("protein")} unit={t("gramUnit")} value={shown.totals.proteinG} max={500} />
                  <NumberField name="carbsG" label={t("carbs")} unit={t("gramUnit")} value={shown.totals.carbsG} max={1000} />
                  <NumberField name="fatG" label={t("fat")} unit={t("gramUnit")} value={shown.totals.fatG} max={500} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="submit" disabled={pending} className="btn btn-primary">
                    {pending ? t("saving") : t("save")}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setStep("review")}>
                    {t("cancel")}
                  </button>
                </div>
              </form>
            ) : null}

            {step === "manual" ? (
              <form onSubmit={saveManual} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <NumberField name="kcal" label={t("kcal")} unit={t("kcalUnit")} max={10000} min={1} placeholder="650" />
                  <NumberField name="proteinG" label={t("protein")} unit={t("gramUnit")} max={500} placeholder="35" />
                </div>
                <label className="block space-y-1.5">
                  <span className="text-meta">
                    {t("labelField")} <span className="text-fg-dim">{t("labelOptional")}</span>
                  </span>
                  <input
                    type="text"
                    name="label"
                    maxLength={200}
                    defaultValue={text}
                    placeholder={t("labelPlaceholder")}
                    className="input w-full"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="submit" disabled={pending} className="btn btn-primary">
                    {pending ? t("saving") : t("logManual")}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => onOpenChange(false)}>
                    {t("cancel")}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <StreakCelebration milestone={celebration} onClose={() => setCelebration(null)} />
    </>
  );
}

function portionLabel(p: number): string {
  return p === 0.5 ? "½" : p === 0.75 ? "¾" : p === 1.25 ? "1¼" : p === 1.5 ? "1½" : String(p);
}

function NumberField({
  name,
  label,
  unit,
  value,
  min = 0,
  max,
  placeholder,
}: {
  name: string;
  label: string;
  unit: string;
  value?: number;
  min?: number;
  max: number;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-meta">{label}</span>
      <input
        type="number"
        name={name}
        inputMode="numeric"
        required
        min={min}
        max={max}
        defaultValue={value}
        placeholder={placeholder}
        className="input w-full tabular-nums"
      />
      <span className="text-micro text-fg-dim">{unit}</span>
    </label>
  );
}

/** The photo with a numbered marker on each thing HQ asks about. */
function MarkedPhoto({ src, questions }: { src: string; questions: MealQuestion[] }) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
      <img src={src} alt="" className="block w-full" />
      {questions.map((q, i) =>
        q.box ? (
          <span
            key={q.id}
            aria-hidden
            data-question-marker={q.id}
            className="absolute border-2 border-bg outline outline-1 outline-fg"
            style={{
              left: `${q.box.x * 100}%`,
              top: `${q.box.y * 100}%`,
              width: `${q.box.w * 100}%`,
              height: `${q.box.h * 100}%`,
            }}
          >
            <span className="absolute -left-0.5 -top-0.5 inline-flex size-6 items-center justify-center bg-fg text-micro text-bg">
              {i + 1}
            </span>
          </span>
        ) : null,
      )}
    </div>
  );
}
