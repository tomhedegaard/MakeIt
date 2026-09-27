import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import Logo from "@/components/Logo";
import { logoutAction } from "@/app/(app)/actions";

/**
 * What a MakeIt Ung account sees until the youth product (spec afsnit 3)
 * is built. A young member must never land in the adult app, where
 * calories, body weight and the pejlemærke live.
 */
export default async function YouthWaiting({ firstName }: { firstName: string }) {
  const t = await getTranslations("Youth.waiting");
  return (
    <main data-youth-waiting="" className="flex-1">
      <Container size="narrow" className="py-10 space-y-8">
        <Logo />
        <div className="space-y-3">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="font-display text-title">{t("title", { name: firstName })}</h1>
          <p className="text-copy text-fg-body max-w-[52ch]">{t("body")}</p>
        </div>
        <div className="border-t hairline pt-6 space-y-2">
          <p className="text-meta font-medium">{t("helpTitle")}</p>
          <p className="text-meta text-fg-dim">{t("help")}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn">{t("logout")}</button>
        </form>
      </Container>
    </main>
  );
}
