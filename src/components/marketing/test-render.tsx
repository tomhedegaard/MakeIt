// Test-only helper, shared by the F2 render tests.
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import da from "../../../messages/da/index";

export function render(el: ReactElement): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="da" timeZone="Europe/Copenhagen" messages={da}>
      {el}
    </NextIntlClientProvider>,
  );
}
