import { Route, Router, Routes, signOut, useAuth } from "lakebed/client";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { HomePage } from "./pages/HomePage";
import { GameRouteWrapper } from "./routes/GameRouteWrapper";

export function App() {
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="absolute top-4 right-4 z-10">
        {!auth.isGuest && !auth.isLoading && (
          <button
            onClick={() => signOut()}
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        )}
      </div>

      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:id" element={<GameRouteWrapper />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Router>
    </div>
  );
}
