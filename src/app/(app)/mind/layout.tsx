import MindSubNav from "@/components/mind/MindSubNav";
import MindSafetyLine from "@/components/mind/MindSafetyLine";

export default function MindLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-domain="mind" className="contents">
      <MindSubNav />
      {children}
      <MindSafetyLine />
    </div>
  );
}
