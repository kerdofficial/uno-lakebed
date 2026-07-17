import { Route, Router, Routes, useAuth } from "lakebed/client";
import { useEffect } from "preact/hooks";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { HomePage } from "./pages/HomePage";
import { GameRouteWrapper } from "./routes/GameRouteWrapper";
import { AnimationStyles } from "./utils/AnimationStyles";
import { applyFavicon } from "./utils/favicon";
import { DEFAULT_GUEST_USER_ID, signOutGuest } from "./utils/guestSession";

export function App() {
  const auth = useAuth();
  const isSignedIn = !auth.isLoading && auth.userId !== DEFAULT_GUEST_USER_ID;

  useEffect(() => {
    applyFavicon();
  }, []);

  return (
    <div className="min-h-[85vh] h-[85vh] bg-neutral-950 text-white overflow-visible">
      <AnimationStyles />
      {isSignedIn && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => signOutGuest()}
            className="text-xs text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}

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
