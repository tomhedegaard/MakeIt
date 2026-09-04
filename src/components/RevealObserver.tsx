"use client";

import { useEffect } from "react";
import { initReveal } from "@/lib/reveal";

export default function RevealObserver() {
  useEffect(() => initReveal(document, window), []);
  return null;
}
