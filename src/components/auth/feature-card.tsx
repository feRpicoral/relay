import type { LucideIcon } from "lucide-react";

export function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-[18px]">
      <div className="bg-primary/15 text-primary mb-3 flex size-[38px] items-center justify-center rounded-md">
        <Icon className="size-[19px]" />
      </div>
      <h3 className="text-[14.5px] font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">{body}</p>
    </div>
  );
}
