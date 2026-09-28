export default function NutritionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-domain="food" className="contents">
      {children}
    </div>
  );
}
