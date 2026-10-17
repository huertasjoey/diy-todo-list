import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { PublicOnly, RequireAuth } from "./auth/Guards";
import DiaryPage from "./pages/DiaryPage";
import Planner from "./Planner";
import { ForgotPassword, Login, Register, ResetPassword, SetupNeeded } from "./pages/AuthPages";
import { configProblem, isConfigured } from "./lib/supabase";

// Keyed by user id: signing in as someone else mounts completely fresh pages.
const PlannerForUser = () => {
  const { user } = useAuth();
  return <Planner key={user.id} />;
};

const DiaryForUser = () => {
  const { user } = useAuth();
  return <DiaryPage key={user.id} />;
};

const Root = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

// A "data router" (rather than <BrowserRouter>) is what lets the diary editor stop you
// leaving a page with unsaved writing, including with the browser's Back button.
const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: "/login", element: <PublicOnly><Login /></PublicOnly> },
      { path: "/register", element: <PublicOnly><Register /></PublicOnly> },
      { path: "/forgot-password", element: <PublicOnly><ForgotPassword /></PublicOnly> },
      // reachable signed-in (recovery session) or signed-out (shows "link expired")
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/", element: <RequireAuth><PlannerForUser /></RequireAuth> },
      { path: "/diary", element: <RequireAuth><DiaryForUser /></RequireAuth> },
      { path: "/diary/:date", element: <RequireAuth><DiaryForUser /></RequireAuth> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

const App = () => (isConfigured ? <RouterProvider router={router} /> : <SetupNeeded problem={configProblem} />);

export default App;
