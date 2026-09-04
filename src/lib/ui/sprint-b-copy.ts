import { getTranslations } from "next-intl/server";
import type { DualStreamCopy } from "@/components/chat/DualStreamMessages";
import type { NeedsAttentionCopy } from "@/components/coach/NeedsAttentionStrip";
import type { FormCheckThreadCopy } from "@/components/form-check/FormCheckThread";
import type { NeedsBucketId } from "@/lib/coach/needs-attention";

const BUCKETS: NeedsBucketId[] = ["sprunget", "afventer_form", "engine"];

export async function loadNeedsAttentionCopy(): Promise<NeedsAttentionCopy> {
  const t = await getTranslations("Coach.needsAttention");
  const buckets = Object.fromEntries(
    BUCKETS.map((id) => [
      id,
      { label: t(`buckets.${id}.label`), empty: t(`buckets.${id}.empty`) },
    ]),
  ) as NeedsAttentionCopy["buckets"];

  return {
    eyebrow: t("eyebrow"),
    title: t("title"),
    open: t("open"),
    buckets,
  };
}

export async function loadDualStreamCopy(): Promise<DualStreamCopy> {
  const t = await getTranslations("Messages.streams");
  return {
    munkTitle: t("munkTitle"),
    munkSub: t("munkSub"),
    motorTitle: t("motorTitle"),
    motorSub: t("motorSub"),
    propose: t("propose"),
    voice: t("voice"),
  };
}

export async function loadFormThreadCopy(): Promise<FormCheckThreadCopy> {
  const t = await getTranslations("Session.exercise.thread");
  return {
    eyebrow: t("eyebrow"),
    pending: t("pending"),
    reviewed: t("reviewed"),
    voice: t("voice"),
    youFilmed: t("youFilmed"),
    munkReply: t("munkReply"),
  };
}
