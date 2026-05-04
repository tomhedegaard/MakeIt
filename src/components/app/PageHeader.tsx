import Container from "@/components/Container";
import { cn } from "@/lib/utils";

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
      <Container className="py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="eyebrow mb-4">{eyebrow}</div>
            <h1 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.95]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-4 max-w-xl text-fg-dim text-base md:text-lg">{subtitle}</p>
            ) : null}
          </div>
          {right}
        </div>
      </Container>
    </div>
  );
}
