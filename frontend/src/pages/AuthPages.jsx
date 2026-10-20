import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { PageSpinner } from "../auth/Guards";
import { CheckIcon } from "../components/Icons";
import ThemeSwitcher from "../components/ThemeSwitcher";

const MIN_PASSWORD = 8;

const inputCls =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15";
const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted";
const primaryBtn =
  "min-h-12 w-full cursor-pointer rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50";
const linkCls = "font-medium text-accent underline underline-offset-4 hover:opacity-80";

const WEEK_PREVIEW = [
  [1, 1, 1, 0, 1, 0, 0],
  [1, 1, 0, 1, 1, 1, 0],
  [0, 1, 1, 1, 0, 0, 0],
];

// Full-screen: a quiet brand panel beside the form (the panel is hidden on small screens).
const Sheet = ({ title, subtitle, children, footer }) => (
  <div className="min-h-dvh bg-bg text-ink lg:grid lg:grid-cols-[1.1fr_1fr]">
    <section
      aria-hidden="true"
      className="relative hidden overflow-hidden border-r border-line bg-surface-2 p-14 lg:flex lg:flex-col lg:justify-between"
    >
      <p className="flex items-center gap-3 font-display text-2xl">
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent text-accent-ink">
          <CheckIcon width={16} height={16} strokeWidth={3} />
        </span>
        Kaizen
      </p>
      <div>
        <p className="font-display text-6xl leading-[1.05] tracking-tight">
          We are what
          <br />
          <em className="text-accent">we practice,</em>
          <br />
          not what we think
          <br />
          we are.
        </p>
        <div className="mt-12 space-y-3">
          {WEEK_PREVIEW.map((row, r) => (
            <div key={r} className="flex gap-3">
              {row.map((on, i) => (
                <span
                  key={i}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                    on ? "border-accent bg-accent text-accent-ink" : "border-muted/40"
                  }`}
                >
                  {on ? <CheckIcon width={16} height={16} strokeWidth={3} /> : null}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted">Your habits and notes stay private to your account.</p>
    </section>

    <main className="flex min-h-dvh flex-col px-5 py-5 sm:px-10">
      <div className="flex justify-end">
        <ThemeSwitcher />
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <h1 className="font-display text-5xl leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        {footer && <p className="mt-8 text-sm text-muted">{footer}</p>}
      </div>
    </main>
  </div>
);

const Field = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className={labelCls}>
      {label}
    </label>
    <input id={id} className={inputCls} {...props} />
  </div>
);

const Alert = ({ children }) =>
  children ? (
    <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
      {children}
    </p>
  ) : null;

const Notice = ({ children }) => (
  <p role="status" className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
    {children}
  </p>
);

const friendly = (message) => {
  if (/invalid login credentials/i.test(message)) return "That email and password don’t match.";
  if (/email not confirmed/i.test(message))
    return "Please confirm your email first. We sent you a link when you registered.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Please wait a minute and try again.";
  return message;
};

export const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await signIn(form.email.trim(), form.password);
    setBusy(false);
    if (error) return setError(friendly(error.message));
    navigate(location.state?.from || "/", { replace: true });
  };

  return (
    <Sheet
      title="Welcome back"
      subtitle="Sign in to open your planner."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className={linkCls}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Alert>{error}</Alert>
        <Field
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Field
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="text-right text-sm">
          <Link to="/forgot-password" className={linkCls}>
            Forgot password?
          </Link>
        </div>
        <button type="submit" disabled={busy || !form.email || !form.password} className={primaryBtn}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </Sheet>
  );
};

export const Register = () => {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < MIN_PASSWORD)
      return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    if (form.password !== form.confirm) return setError("The two passwords don’t match.");

    setBusy(true);
    const { data, error } = await signUp(form.email.trim(), form.password, form.name);
    setBusy(false);
    if (error) return setError(friendly(error.message));
    // With email confirmation on there is no session yet. With it off, the new session
    // makes the router open the planner on its own. Either way we say the same thing
    // here, so the form never reveals whether an email is already registered.
    if (!data.session) setSent(true);
  };

  if (sent)
    return (
      <Sheet
        title="Check your email"
        footer={
          <Link to="/login" className={linkCls}>
            Back to sign in
          </Link>
        }
      >
        <Notice>
          If this address can be registered, a confirmation link is on its way to{" "}
          <strong>{form.email.trim()}</strong>. Open it to finish creating your planner.
        </Notice>
      </Sheet>
    );

  return (
    <Sheet
      title="Start your planner"
      subtitle="Your habits and notes stay private to your account."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className={linkCls}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Alert>{error}</Alert>
        <Field
          label="Name (optional)"
          id="name"
          type="text"
          autoComplete="name"
          maxLength={60}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Field
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Field
          label={`Password (${MIN_PASSWORD}+ characters)`}
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Field
          label="Confirm password"
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />
        <button type="submit" disabled={busy || !form.email || !form.password} className={primaryBtn}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </Sheet>
  );
};

export const ForgotPassword = () => {
  const { requestReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await requestReset(email.trim());
    setBusy(false);
    // Only real failures (e.g. rate limiting) are shown. An unknown address looks the same as a known one.
    if (error) return setError(friendly(error.message));
    setSent(true);
  };

  return (
    <Sheet
      title="Reset password"
      subtitle="We’ll email you a link to choose a new one."
      footer={
        <Link to="/login" className={linkCls}>
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Notice>
          If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It
          may take a minute to arrive.
        </Notice>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Alert>{error}</Alert>
          <Field
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={busy || !email} className={primaryBtn}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </Sheet>
  );
};

export const ResetPassword = () => {
  const { session, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <PageSpinner />;

  // Reaching this page without a recovery session means the link was used up or expired.
  if (!session)
    return (
      <Sheet
        title="Link expired"
        footer={
          <Link to="/login" className={linkCls}>
            Back to sign in
          </Link>
        }
      >
        <Alert>This reset link is no longer valid.</Alert>
        <p className="mt-4 text-center text-sm">
          <Link to="/forgot-password" className={linkCls}>
            Send me a new link
          </Link>
        </p>
      </Sheet>
    );

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < MIN_PASSWORD)
      return setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
    if (form.password !== form.confirm) return setError("The two passwords don’t match.");
    setBusy(true);
    const { error } = await updatePassword(form.password);
    setBusy(false);
    if (error) return setError(friendly(error.message));
    navigate("/", { replace: true });
  };

  return (
    <Sheet title="New password" subtitle="Choose a password you haven’t used elsewhere.">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Alert>{error}</Alert>
        <Field
          label={`New password (${MIN_PASSWORD}+ characters)`}
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Field
          label="Confirm new password"
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />
        <button type="submit" disabled={busy || !form.password} className={primaryBtn}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </Sheet>
  );
};

export const SetupNeeded = ({ problem }) => (
  <Sheet
    title={problem?.missing ? "Almost there" : "Check the settings"}
    subtitle={
      problem?.missing
        ? "This planner needs a Supabase project."
        : "The Supabase settings in this build aren’t usable."
    }
  >
    <div className="space-y-3 text-sm leading-6">
      {problem && !problem.missing && <Alert>{problem.message}</Alert>}
      <p>
        Set <code className="rounded bg-surface-2 px-1.5">VITE_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-surface-2 px-1.5">VITE_SUPABASE_ANON_KEY</code>. Locally that
        is <code className="rounded bg-surface-2 px-1.5">frontend/.env</code>. On a host such as
        Render, add them as environment variables, then rebuild.
      </p>
      <p>
        See <code className="rounded bg-surface-2 px-1.5">SETUP.md</code> for the full steps.
      </p>
    </div>
  </Sheet>
);
