import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export const PageSpinner = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
  </div>
);

// Nothing private renders until the session is known to be valid.
export const RequireAuth = ({ children }) => {
  const { session, loading, recovery } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (recovery) return <Navigate to="/reset-password" replace />;
  return children;
};

// Login, register and forgot-password are for signed-out visitors only.
export const PublicOnly = ({ children }) => {
  const { session, loading, recovery } = useAuth();

  if (loading) return <PageSpinner />;
  if (session && !recovery) return <Navigate to="/" replace />;
  if (session && recovery) return <Navigate to="/reset-password" replace />;
  return children;
};
