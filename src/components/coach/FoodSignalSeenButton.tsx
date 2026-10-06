"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { markFoodSignalSeenAction } from "@/app/coach/inbox/actions";

export default function FoodSignalSeenButton({ memberId }: { memberId: string }) {
  const t = useTranslations("Coach.inbox");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if ((await markFoodSignalSeenAction(memberId)).ok) router.refresh();
        })
      }
    >
      {t("foodSeen")}
    </button>
  );
}
