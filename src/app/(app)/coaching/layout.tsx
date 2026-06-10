export default function CoachingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-domain="body" className="contents">
      {children}
    </div>
  );
}
