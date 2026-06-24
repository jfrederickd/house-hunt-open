import { Construction } from "lucide-react";

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center text-muted-foreground">
        <Construction className="size-6" />
        <p className="text-sm">Coming in {phase}.</p>
      </div>
    </div>
  );
}
