import Container from "@/components/Container";
import PageTitle from "@/components/ui/PageTitle";
import { cn } from "@/lib/utils";

/** Page header band: PageTitle (one scale) + optional subtitle, inside the page container. */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  className,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className={cn("border-b hairline", className)}>
      {/* 32 px mellem sektioner (spec §5) */}
      <Container className="py-8 md:py-12">
        <PageTitle kicker={eyebrow} title={title} action={right} />
        {subtitle ? <p className="mt-3 max-w-xl text-copy text-fg-body">{subtitle}</p> : null}
      </Container>
    </div>
  );
}
