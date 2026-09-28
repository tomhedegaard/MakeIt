export default function HrvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-domain="heart" className="contents">
      {children}
    </div>
  );
}
