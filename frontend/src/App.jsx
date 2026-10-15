import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { PublicOnly, RequireAuth } from "./auth/Guards";
import Planner from "./Planner";
import { ForgotPassword, Login, Register, ResetPassword, SetupNeeded } from "./pages/AuthPages";
import { isConfigured } from "./lib/supabase";


// keyed by user id: signing in as someone else mounts a completely fresh planner
const PlannerForUser = () => {
  const { user } = useAuth();
  return <Planner key={user.id} />;
};

const App = () => {
  if (!isConfigured) return <SetupNeeded />;

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        {/* reachable signed-in (recovery session) or signed-out (shows "link expired") */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<RequireAuth><PlannerForUser /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
