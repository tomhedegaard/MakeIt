/**
 * Honest first-run pickers for connected mode.
 *
 * Demo (`!SUPABASE_ENABLED`) keeps rich mocks. Connected members with
 * no real training history get null / zeros / empty — never STR-12
 * week 4, never 84.2K volume, never a fabricated WHY strip.
 */

import type { EngineStripModel } from "@/lib/adaptive/engine-strip";
import type {
  CrewItem,
  MemberStats,
  TodayCard,
  UpcomingSession,
} from "@/lib/data/dashboard";
import type { ProgramListing, WeekDay } from "@/lib/data/coaching";

export function emptyMemberStats(): MemberStats {
  return {
    volumeKg: 0,
    volumeKgPrev: 0,
    prs4w: 0,
    prsPrev: 0,
    repsBalance: 0,
    streakDays: 0,
  };
}

export function todayCardForSurface(opts: {
  connected: boolean;
  fromDb: TodayCard | null;
  demo: TodayCard;
}): TodayCard | null {
  if (!opts.connected) return opts.demo;
  return opts.fromDb;
}

export function upcomingForSurface(opts: {
  connected: boolean;
  fromDb: UpcomingSession[] | null;
}): UpcomingSession[] | null {
  if (!opts.connected) return null;
  return opts.fromDb ?? [];
}

export function feedForSurface(opts: {
  connected: boolean;
  fromDb: CrewItem[] | null;
}): CrewItem[] | null {
  if (!opts.connected) return null;
  return opts.fromDb ?? [];
}

export function statsForSurface(opts: {
  connected: boolean;
  fromDb: MemberStats | null;
}): MemberStats | null {
  if (!opts.connected) return null;
  return opts.fromDb ?? emptyMemberStats();
}

export function weekStripForSurface(opts: {
  connected: boolean;
  fromDb: WeekDay[] | null;
  demo: WeekDay[];
  empty: WeekDay[];
}): WeekDay[] {
  if (!opts.connected) return opts.fromDb ?? opts.demo;
  return opts.fromDb ?? opts.empty;
}

export function libraryForSurface(opts: {
  connected: boolean;
  fromDb: ProgramListing[] | null;
  demo: ProgramListing[];
}): ProgramListing[] {
  if (!opts.connected) return opts.fromDb ?? opts.demo;
  return opts.fromDb ?? [];
}

export function engineStripForSurface(opts: {
  connected: boolean;
  fromSignals: EngineStripModel;
  demo: EngineStripModel;
}): EngineStripModel {
  if (!opts.connected) return opts.demo;
  return opts.fromSignals;
}

