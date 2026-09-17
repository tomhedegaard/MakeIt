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
      <Container className="py-10 md:py-14">
        <PageTitle kicker={eyebrow} title={title} action={right} />
        {subtitle ? <p className="mt-4 max-w-xl text-fg-dim text-base md:text-lg">{subtitle}</p> : null}
      </Container>
    </div>
  );
}
