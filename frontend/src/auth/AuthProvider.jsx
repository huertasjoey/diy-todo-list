import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

// A password-recovery link lands with this in the URL hash. Read it before the
// Supabase client strips it, so the reset form is shown even if the event fires early.
const openedFromRecoveryLink =
  typeof window !== "undefined" && window.location.hash.includes("type=recovery");

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  // true until we know whether a saved session exists, so private pages never flash
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recovery, setRecovery] = useState(openedFromRecoveryLink);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const meta = user?.user_metadata ?? {};
    const displayName = (meta.display_name || "").trim() || user?.email?.split("@")[0] || "";

    return {
      session,
      user,
      displayName,
      loading,
      recovery,

      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),

      signUp: (email, password, name) =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        }),

      requestReset: (email) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        }),

      updatePassword: async (password) => {
        const result = await supabase.auth.updateUser({ password });
        if (!result.error) setRecovery(false);
        return result;
      },

      // "local" ends only this device's session; other devices stay signed in
      signOut: () => supabase.auth.signOut({ scope: "local" }),
    };
  }, [session, loading, recovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
