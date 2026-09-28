export default function MindLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-domain="mind" className="contents">
      {children}
    </div>
  );
}
