import { useAuth } from "lakebed/client";

export function AuthCallbackPage() {
  useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen text-neutral-400">
      Signing in...
    </div>
  );
}
