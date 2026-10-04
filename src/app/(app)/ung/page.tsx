import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { getSession } from "@/lib/auth";
import { guardianshipsFor, youthPilotAllowed, type Guardianship } from "@/lib/youth/guardianship";
import { intlLocaleTag } from "@/i18n/config";
import { noticesForGuardian, type GuardianNotice } from "@/lib/youth/notices";
import { effectiveConsent } from "@/lib/youth/rules";
import { noticeValues, type NoticeSignal, type SignalDetail } from "@/lib/youth/signals";
import { endGuardianshipAction, inviteYouthAction, resendInvitationAction, updateConsentAction } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("Youth.guardian");
  return { title: t("metaTitle") };
}

/**
 * MakeIt Ung for the guardian (spec afsnit 2): invite a 15–17-year-old,
 * give consent per area, see the status, change consent, end it, and
 * read every notice they have been sent (del 3, afsnit 5).
 * Closed pilot: only YOUTH_PILOT_GUARDIANS and admins reach this page.
 */
export default async function YouthGuardianPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; saved?: string; ended?: string; err?: string }>;
}) {
  const member = (await getSession())!;
  if (!youthPilotAllowed(member)) redirect("/dashboard");
  const t = await getTranslations("Youth.guardian");
  const { sent, saved, ended, err } = await searchParams;
  const [rows, notices, locale, tn] = await Promise.all([
    guardianshipsFor(member.id),
    noticesForGuardian(member.id),
    getLocale(),
    getTranslations("Youth.notices"),
  ]);

  const notice = err ? t(`errors.${err}` as never) : sent ? t("sent") : saved ? t("saved") : ended ? t("ended") : null;

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-8 space-y-8 max-w-2xl">
        {notice ? (
          <p role="status" className="border hairline bg-bg-2 px-4 py-3 text-meta text-fg-body">
            {notice}
          </p>
        ) : null}

        {rows.map((g) => (
          <GuardianshipCard
            key={g.id}
            g={g}
            t={t}
            notices={
              <NoticeList notices={notices.filter((n) => n.guardianship_id === g.id)} name={g.youth_first_name} tn={tn} locale={locale} />
            }
          />
        ))}

        {rows.length === 0 ? (
          <section className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-section">{t("inviteTitle")}</h2>
              <p className="text-copy text-fg-body">{t("inviteIntro")}</p>
            </div>
            <form action={inviteYouthAction} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-meta">{t("firstName")}</span>
                <input name="firstName" required maxLength={60} className="field" autoComplete="off" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-meta">{t("email")}</span>
                <input name="email" type="email" required maxLength={254} className="field" autoComplete="off" spellCheck={false} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-meta">{t("birthDate")}</span>
                <input name="birthDate" type="date" required className="field" />
                <span className="text-micro text-fg-dim">{t("birthDateHint")}</span>
              </label>

              <fieldset className="space-y-3 border-t hairline pt-4">
                <legend className="text-meta font-medium">{t("consentTitle")}</legend>
                <p className="text-meta text-fg-dim">{t("consentTraining")}</p>
                <Check name="consentRecovery" label={t("consentRecovery")} />
                <Check name="consentMind" label={t("consentMind")} />
              </fieldset>

              <div className="border-t hairline pt-4 space-y-2">
                <p className="text-meta font-medium">{t("alertTitle")}</p>
                <p className="text-meta text-fg-dim">{t("alertBody")}</p>
              </div>

              <Check name="declaration" label={t("declaration")} required />

              <button type="submit" className="btn btn-primary w-full">{t("send")}</button>
            </form>
          </section>
        ) : null}
      </Container>
    </>
  );
}

function Check({ name, label, required, defaultChecked }: { name: string; label: string; required?: boolean; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-3 text-meta">
      <input type="checkbox" name={name} required={required} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-fg" />
      <span>{label}</span>
    </label>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"Youth.guardian">>>;

function GuardianshipCard({ g, t, notices }: { g: Guardianship; t: T; notices: React.ReactNode }) {
  const active = g.status === "active";
  return (
    <section data-guardianship={g.status} className="border hairline bg-bg-2 p-5 space-y-5">
      <div>
        <SectionHeader eyebrow={active ? t("statusActive") : t("statusInvited")} title={g.youth_first_name} className="mb-1" />
        <p className="text-meta text-fg-dim">{g.youth_email}</p>
      </div>

      <form action={updateConsentAction} className="space-y-3">
        <input type="hidden" name="id" value={g.id} />
        <p className="text-meta font-medium">{t("consentTitle")}</p>
        <p className="text-meta text-fg-dim">{t("consentTraining")}</p>
        <Check name="consentRecovery" label={t("consentRecovery")} defaultChecked={g.guardian_consent_recovery} />
        <Check name="consentMind" label={t("consentMind")} defaultChecked={g.guardian_consent_mind} />
        {active ? (
          <p className="text-meta text-fg-dim">
            {t("effective", {
              recovery: effectiveConsent(g.guardian_consent_recovery, g.youth_consent_recovery) ? t("on") : t("off"),
              mind: effectiveConsent(g.guardian_consent_mind, g.youth_consent_mind) ? t("on") : t("off"),
            })}
          </p>
        ) : null}
        <button type="submit" className="btn btn-sm">{t("saveConsent")}</button>
      </form>

      {active ? notices : null}

      {!active ? (
        <form action={resendInvitationAction}>
          <input type="hidden" name="id" value={g.id} />
          <button type="submit" className="btn btn-sm btn-ghost">{t("resend")}</button>
        </form>
      ) : null}

      <form action={endGuardianshipAction} className="border-t hairline pt-4 space-y-3">
        <input type="hidden" name="id" value={g.id} />
        <p className="text-meta font-medium">{active ? t("endTitle") : t("withdrawTitle")}</p>
        <p className="text-meta text-fg-dim">{active ? t("endBody") : t("withdrawBody")}</p>
        <Check name="confirm" label={t("endConfirm")} required />
        <button type="submit" className="btn btn-sm">{active ? t("end") : t("withdraw")}</button>
      </form>
    </section>
  );
}

type TN = Awaited<ReturnType<typeof getTranslations<"Youth.notices">>>;

function NoticeList({ notices, name, tn, locale }: { notices: GuardianNotice[]; name: string; tn: TN; locale: string }) {
  const date = new Intl.DateTimeFormat(intlLocaleTag(locale), { day: "numeric", month: "long", timeZone: "Europe/Copenhagen" });
  return (
    <div className="border-t hairline pt-4 space-y-3" data-guardian-notices="">
      <p className="text-meta font-medium">{tn("listTitle")}</p>
      {notices.length === 0 ? (
        <p className="text-meta text-fg-dim">{tn("listEmpty")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {notices.map((n) => (
            <li key={n.id} data-notice-level={n.level} className="py-3 space-y-1">
              <p className="text-meta text-fg-dim">
                {date.format(new Date(n.created_at))} · {n.level === "acute" ? tn("eyebrowAcute") : tn("eyebrowConcern")}
              </p>
              <p className="text-copy text-fg">{tn(n.signal as NoticeSignal, noticeValues(n.detail as SignalDetail, name))}</p>
              <p className="text-meta text-fg-dim">{n.youth_seen_at ? tn("seen", { name }) : tn("notSeen", { name })}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
