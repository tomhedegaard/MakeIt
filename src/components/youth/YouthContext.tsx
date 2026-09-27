"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { YouthClaims } from "@/lib/youth/routes";

/**
 * MakeIt Ung: lets client components in the app know they are showing a
 * young account (e.g. to add Børnetelefonen and headspace next to
 * Livslinien). Provided by AppShell; null for adults.
 */
const YouthContext = createContext<YouthClaims | null>(null);

export function YouthProvider({ value, children }: { value: YouthClaims | null; children: ReactNode }) {
  return <YouthContext.Provider value={value}>{children}</YouthContext.Provider>;
}

export function useYouth(): YouthClaims | null {
  return useContext(YouthContext);
}
