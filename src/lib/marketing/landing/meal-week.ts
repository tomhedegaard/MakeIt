/**
 * The landing's example week (chapter Mad). Seven real dishes from the
 * mock plan (`src/lib/nutrition/mock-plan.ts`) with their macros, and an
 * Unsplash photo per dish, credited on the page. Where the photo shows a
 * variant of the plan's dish, the title on the page describes the photo. Titles live in
 * `Marketing.landing.chapters.food.meals` in the same order.
 */
export type MealPhoto = { url: string; author: string; authorUrl: string };

export const MEAL_WEEK: { kcal: number; protein: number; carbs: number; fat: number; photo: MealPhoto | null }[] = [
  { kcal: 420, protein: 38, carbs: 42, fat: 12, photo: { url: "https://images.unsplash.com/photo-1675868022402-631b0aebd053", author: "Joan McEwan", authorUrl: "https://unsplash.com/@joaniejoan" } },
  { kcal: 580, protein: 48, carbs: 56, fat: 16, photo: { url: "https://images.unsplash.com/photo-1666599028424-e316d4e34aa6", author: "You Le", authorUrl: "https://unsplash.com/@le_y0u" } },
  { kcal: 620, protein: 38, carbs: 52, fat: 28, photo: { url: "https://images.unsplash.com/photo-1748712831461-9fbf45338e13", author: "Ксения Лунарис", authorUrl: "https://unsplash.com/@kseniavisuals" } },
  { kcal: 410, protein: 28, carbs: 38, fat: 14, photo: { url: "https://images.unsplash.com/photo-1676465148323-973b3a7f970b", author: "Filipp Romanovski", authorUrl: "https://unsplash.com/@filipp_roman_photography" } },
  { kcal: 680, protein: 48, carbs: 58, fat: 22, photo: { url: "https://images.unsplash.com/photo-1676471755539-d99326272d53", author: "Nima Naseri", authorUrl: "https://unsplash.com/@nimanaseri" } },
  { kcal: 520, protein: 18, carbs: 78, fat: 14, photo: { url: "https://images.unsplash.com/photo-1650265929273-00c7ac3cb0e7", author: "Elena Leya", authorUrl: "https://unsplash.com/@foodistika" } },
  { kcal: 540, protein: 22, carbs: 84, fat: 14, photo: { url: "https://images.unsplash.com/photo-1612700722193-f0410adb8949", author: "Weronika Krztoń", authorUrl: "https://unsplash.com/@weronikakrzton" } },
];

/** Unsplash's own image CDN, sized for a 4:5 card. */
export const mealPhotoSrc = (url: string, w: number) => `${url}?w=${w}&h=${Math.round(w * 1.25)}&fit=crop&auto=format&q=70`;
