import { MOCK_EXERCISES } from "@/lib/data/exercise-mocks";
import { resolveSessionDemoAssetUrl } from "@/lib/data/session-demo-assets";
import type { ExerciseLibrary, Session } from "@/lib/workout";

/**
 * Map a published library row (or demo mock) onto the session
 * `ExerciseLibrary` slice — including the resolved demo loop URL.
 */
export function libraryFromMockSlug(slug: string): ExerciseLibrary | null {
  const mock = MOCK_EXERCISES.find((e) => e.slug === slug);
  if (!mock) return null;
  return {
    exerciseId: mock.id,
    slug: mock.slug,
    cues: mock.cues,
    mistakes: mock.mistakes,
    primaryMuscles: mock.primaryMuscles,
    secondaryMuscles: mock.secondaryMuscles,
    tertiaryMuscles: mock.tertiaryMuscles,
    demoAssetUrl: resolveSessionDemoAssetUrl(mock.demoAssetUrl, mock.slug),
    phases: mock.phases,
  };
}

function mockByName(name: string) {
  const key = name.trim().toLowerCase();
  return MOCK_EXERCISES.find((e) => e.name.toLowerCase() === key) ?? null;
}

/**
 * Demo-mode TODAY_SESSION (and any other in-memory session) ships
 * with name + cue only. Attach the library join the connected path
 * would have hydrated — cues, muscles, phases, demoAssetUrl.
 *
 * Does not mutate the input. Unknown names stay library-less so the
 * legacy single-cue fallback still works.
 */
export function hydrateDemoSessionLibrary(session: Session): Session {
  return {
    ...session,
    exercises: session.exercises.map((ex) => {
      if (ex.library?.slug) {
        return {
          ...ex,
          library: {
            ...ex.library,
            demoAssetUrl: resolveSessionDemoAssetUrl(
              ex.library.demoAssetUrl,
              ex.library.slug,
            ),
            phases: ex.library.phases ?? [],
          },
        };
      }
      const mock = mockByName(ex.name);
      if (!mock) return ex;
      const library = libraryFromMockSlug(mock.slug);
      return library ? { ...ex, library } : ex;
    }),
  };
}
