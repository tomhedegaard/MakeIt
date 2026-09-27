import { getTranslations } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";
import type { GuardianNotice } from "@/lib/youth/notices";
import { noticeValues, type NoticeSignal, type SignalDetail } from "@/lib/youth/signals";
import { acknowledgeNoticeAction } from "./actions";

/**
 * "Vi har sendt din forælder denne besked, fordi …" (spec afsnit 5).
 * The young member reads the exact sentence their guardian got, so
 * nothing happens behind their back. Stays until they mark it seen.
 */
export default async function YouthNotices({ notices, name }: { notices: GuardianNotice[]; name: string }) {
  if (notices.length === 0) return null;
  const t = await getTranslations("Youth.notices");
  return (
    <>
      {notices.map((n) => (
        <section key={n.id} data-youth-notice={n.level} className="border hairline bg-bg-2 p-5 space-y-4">
          <SectionHeader eyebrow={t("youthEyebrow")} title={t("youthTitle")} className="mb-0" />
          <blockquote className="border-l-2 border-signal pl-4 text-copy text-fg">
            {t(n.signal as NoticeSignal, noticeValues(n.detail as SignalDetail, name))}
          </blockquote>
          <p className="text-copy text-fg-body">{t("youthBody")}</p>
          <p className="text-meta text-fg-dim">{t("youthHelp")}</p>
          <form action={acknowledgeNoticeAction}>
            <input type="hidden" name="id" value={n.id} />
            <button type="submit" className="btn btn-sm">{t("youthAck")}</button>
          </form>
        </section>
      ))}
    </>
  );
}
