import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <MapPinOff className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">Not found</p>
        <p className="text-sm text-muted-foreground">That property doesn’t exist or was deleted.</p>
      </div>
      <Button nativeButton={false} render={<Link href="/" />}>Back to dashboard</Button>
    </div>
  );
}
