import { MapPin } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MapPin className="size-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">House Hunt</h1>
        <p className="text-sm text-muted-foreground">Enter the shared password to continue.</p>
      </div>
      <LoginForm next={next ?? "/"} />
    </div>
  );
}
