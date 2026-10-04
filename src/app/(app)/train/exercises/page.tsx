import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import ExerciseCard from "@/components/exercise/ExerciseCard";
import FilterPill from "@/components/exercise/FilterPill";
import LibraryFilterForm from "@/components/exercise/LibraryFilterForm";
import { COMPANY } from "@/lib/company";
import { libraryHref, normalizeSearch, pickFacet } from "@/lib/data/exercise-library-url";
import { listPublishedExerciseFacets, listPublishedExercises } from "@/lib/data/exercises";

export async function generateMetadata() {
  const t = await getTranslations("Train.index");
  return {
    title: `${t("metaTitle")} · ${COMPANY.product}`,
  };
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ExercisesIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const t = await getTranslations("Train");

  // The filter choices come from what is actually published, so a
  // category or an implement nobody can find never shows, and a made-up
  // value in the URL is ignored.
  const facets = await listPublishedExerciseFacets();
  const q = normalizeSearch(params.q);
  const category = pickFacet(params.category, facets.categories);
  const equipment = pickFacet(params.equipment, facets.equipment);
  const exercises = await listPublishedExercises({ q, category, equipment });
  const filtered = Boolean(q || category || equipment);

  const label = (group: "categories" | "equipment", value: string) =>
    t.has(`${group}.${value}`) ? t(`${group}.${value}`) : value;

  return (
    <>
      <PageHeader
        eyebrow={t("index.eyebrow")}
        title={t("index.title")}
        subtitle={t("index.subtitle")}
      />

      <Container className="py-10 md:py-14 space-y-8">
        <div className="space-y-4">
          <LibraryFilterForm
            q={q ?? ""}
            category={category ?? ""}
            equipment={equipment ?? ""}
            equipmentOptions={facets.equipment.map((value) => ({ value, label: label("equipment", value) }))}
            labels={{
              search: t("index.searchLabel"),
              placeholder: t("index.searchPlaceholder"),
              equipment: t("index.equipmentLabel"),
              allEquipment: t("index.allEquipment"),
              submit: t("index.submit"),
            }}
          />

          {facets.categories.length > 0 ? (
            <nav aria-label={t("index.categoryNav")} className="flex flex-wrap gap-2">
              <FilterPill
                href={libraryHref({ q, equipment })}
                active={!category}
                label={t("index.allFilter")}
              />
              {facets.categories.map((c) => (
                <FilterPill
                  key={c}
                  href={libraryHref({ q, equipment, category: c })}
                  active={category === c}
                  label={label("categories", c)}
                />
              ))}
            </nav>
          ) : null}
        </div>

        <p className="text-meta text-fg-dim" role="status">
          {t("index.count", { count: exercises.length })}
        </p>

        {exercises.length === 0 ? (
          filtered ? (
            <p className="text-fg-dim">
              {t("index.emptyFiltered")}{" "}
              <Link href={libraryHref()} className="underline underline-offset-4">
                {t("index.reset")}
              </Link>
            </p>
          ) : (
            <p className="text-fg-dim">{t("index.empty")}</p>
          )
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
              <li key={ex.slug} className="min-w-0">
                <ExerciseCard exercise={ex} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
