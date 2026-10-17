import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { askWritingAssistant } from "../lib/diaryDb";
import { wordCount } from "../lib/diary";
import { SparklesIcon } from "./Icons";

const MAX_CHARS = 6000; // the most the server accepts in one request

const TOOLS = [
  { id: "correct", label: "Correct my writing", hint: "Fix grammar and spelling, with explanations." },
  { id: "natural", label: "Make it more natural", hint: "Rewrite it so it sounds fluent." },
  { id: "mistakes", label: "Explain my mistakes", hint: "See each mistake and why it is one." },
  { id: "vocabulary", label: "Learn new vocabulary", hint: "Useful words and phrases from your text." },
];

const STYLES = [
  { id: "simple", label: "Simple English" },
  { id: "conversational", label: "Natural conversational" },
  { id: "professional", label: "More professional" },
];

const ACK_KEY = "kaizen-ai-ack";
const readAck = () => {
  try {
    return localStorage.getItem(ACK_KEY) === "yes";
  } catch {
    return false;
  }
};

const btn =
  "min-h-11 cursor-pointer rounded-full border border-line px-4 text-sm font-medium transition-colors hover:bg-surface-2 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent";
const primary =
  "min-h-11 cursor-pointer rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50";

const Block = ({ label, children, tone = "" }) => (
  <div className={`rounded-xl border border-line p-3 ${tone}`}>
    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
    <div className="whitespace-pre-wrap break-words text-sm leading-6">{children}</div>
  </div>
);

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Couldn't copy. Select the text and copy it yourself.");
  }
};

/**
 * "Improve My Writing". Nothing is sent anywhere until a tool button is pressed, and the
 * person's own text is never changed until they press Apply (with a one-click undo).
 *
 * content / selection: the journal text and the current selection in it
 * onReplace(range, expected, replacement) -> boolean   (false if the text moved on)
 * onRestore(previousContent)                          (puts the original back)
 */
const WritingAssistant = ({ content, selection, onReplace, onRestore }) => {
  const [ack, setAck] = useState(readAck);
  const [style, setStyle] = useState("conversational");
  const [running, setRunning] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [undo, setUndo] = useState(null);
  const latest = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const hasSelection =
    selection.end > selection.start && content.slice(selection.start, selection.end).trim() !== "";
  const range = hasSelection ? { start: selection.start, end: selection.end } : { start: 0, end: content.length };
  const scopeText = content.slice(range.start, range.end);
  const tooLong = scopeText.length > MAX_CHARS;

  const setAcknowledged = (on) => {
    setAck(on);
    try {
      localStorage.setItem(ACK_KEY, on ? "yes" : "no");
    } catch {
      // private mode: the tick still counts for this visit
    }
  };

  const run = async (action) => {
    if (!ack || running) return;
    if (!scopeText.trim()) return setError({ message: "Write something in your journal first, then ask for help." });
    if (tooLong)
      return setError({ message: `That's ${scopeText.length.toLocaleString()} characters. Select a part of up to ${MAX_CHARS.toLocaleString()} and try again.` });

    const mine = ++latest.current;
    setRunning(action);
    setError(null);
    setResult(null);
    try {
      const data = await askWritingAssistant({ action, text: scopeText, style: action === "natural" ? style : undefined });
      if (mine !== latest.current || !mounted.current) return;
      setResult({ action, original: scopeText, range, data, applied: false });
    } catch (e) {
      if (mine === latest.current && mounted.current) setError({ message: e.message, code: e.code });
    } finally {
      if (mine === latest.current && mounted.current) setRunning(null);
    }
  };

  const apply = (replacement) => {
    const previous = content;
    if (!onReplace(result.range, result.original, replacement)) {
      setError({ message: "Your text changed after this suggestion was made, so nothing was applied. Run the tool again, or copy the suggestion." });
      return;
    }
    setUndo({ previous });
    setResult((r) => ({ ...r, applied: true }));
    toast.success("Applied to your journal. You can restore your original.");
  };

  const restore = () => {
    onRestore(undo.previous);
    setUndo(null);
    setResult((r) => (r ? { ...r, applied: false } : r));
  };

  const suggestion = result && (result.action === "correct" ? result.data.correctedText : result.action === "natural" ? result.data.rewrittenText : null);

  return (
    <section aria-labelledby="assistant-heading" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 id="assistant-heading" className="flex items-center gap-2 font-display text-2xl leading-none">
        <SparklesIcon width={18} height={18} aria-hidden="true" className="text-accent" /> Improve my writing
      </h2>
      <p className="mt-2 text-sm text-muted">
        Get help with grammar, wording and clarity. Your original is never changed until you press Apply.
      </p>

      <div className="mt-4 rounded-xl border border-line bg-bg p-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent)]"
          />
          <span>
            I understand that when I press a tool below, the text it uses is <strong>sent to an AI service</strong> to
            produce suggestions. My diary is not sent at any other time.
          </span>
        </label>
      </div>

      <p className="mt-4 text-xs text-muted" aria-live="polite">
        {hasSelection ? "Using your selected text" : "Using your whole journal"} ({wordCount(scopeText)} words
        {tooLong ? `, over the ${MAX_CHARS.toLocaleString()} character limit: select a shorter part` : ""}). Select part of
        your journal to work on just that.
      </p>

      <div className="mt-3 grid gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!ack || Boolean(running) || tooLong || !scopeText.trim()}
            onClick={() => run(t.id)}
            className={`${btn} flex flex-col items-start gap-0.5 py-2 text-left`}
          >
            <span>{running === t.id ? "Working…" : t.label}</span>
            <span className="text-xs font-normal text-muted">{t.hint}</span>
          </button>
        ))}
      </div>

      <fieldset className="mt-3">
        <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Style for “Make it more natural”
        </legend>
        <div role="radiogroup" aria-label="Style" className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={style === s.id}
              onClick={() => setStyle(s.id)}
              className={`min-h-11 cursor-pointer rounded-full border px-3 text-xs font-medium transition-colors ${
                style === s.id ? "border-accent bg-accent-soft text-ink" : "border-line text-muted hover:bg-surface-2"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error.message}
        </p>
      )}

      {undo && (
        <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
          <span>Applied to your journal.</span>
          <button type="button" onClick={restore} className={btn}>
            Restore my original
          </button>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-3" aria-live="polite">
          <Block label="Your original text">{result.original}</Block>

          {suggestion && (
            <Block label={result.action === "correct" ? "Corrected version" : "More natural version"} tone="border-accent/40 bg-accent-soft/40">
              {suggestion}
            </Block>
          )}

          {suggestion && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={result.applied} onClick={() => apply(suggestion)} className={primary}>
                {result.applied ? "Applied" : "Apply to my journal"}
              </button>
              <button type="button" onClick={() => copy(suggestion)} className={btn}>
                Copy
              </button>
            </div>
          )}

          {result.action === "correct" && (
            <>
              <h3 className="pt-1 text-sm font-semibold">What changed, and why</h3>
              {result.data.changes.length === 0 ? (
                <p className="text-sm text-muted">No important corrections. Your writing looks good.</p>
              ) : (
                <ul className="space-y-2">
                  {result.data.changes.map((c, i) => (
                    <li key={i} className="rounded-xl border border-line p-3 text-sm">
                      <p>
                        <span className="text-danger line-through decoration-danger/60">{c.original}</span>
                        {"  →  "}
                        <span className="font-medium text-accent">{c.corrected}</span>
                      </p>
                      <p className="mt-1 text-muted">{c.explanation}</p>
                    </li>
                  ))}
                </ul>
              )}
              {result.data.vocabulary.length > 0 && (
                <>
                  <h3 className="pt-1 text-sm font-semibold">Better words and phrases</h3>
                  <ul className="space-y-2">
                    {result.data.vocabulary.map((v, i) => (
                      <li key={i} className="rounded-xl border border-line p-3 text-sm">
                        <p>
                          Instead of <strong>{v.insteadOf}</strong>, try <strong className="text-accent">{v.tryThis}</strong>
                        </p>
                        {v.note && <p className="mt-1 text-muted">{v.note}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {result.action === "natural" && result.data.notes.length > 0 && (
            <>
              <h3 className="pt-1 text-sm font-semibold">What I changed</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                {result.data.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </>
          )}

          {result.action === "mistakes" &&
            (result.data.mistakes.length === 0 ? (
              <p className="text-sm text-muted">No grammar mistakes found. Nice work.</p>
            ) : (
              <ul className="space-y-2">
                {result.data.mistakes.map((m, i) => (
                  <li key={i} className="rounded-xl border border-line p-3 text-sm">
                    <p className="text-danger line-through decoration-danger/60">{m.original}</p>
                    <p className="mt-1 font-medium text-accent">{m.corrected}</p>
                    <p className="mt-1 text-muted">{m.explanation}</p>
                  </li>
                ))}
              </ul>
            ))}

          {result.action === "vocabulary" &&
            (result.data.items.length === 0 ? (
              <p className="text-sm text-muted">No new words stood out this time.</p>
            ) : (
              <ul className="space-y-2">
                {result.data.items.map((v, i) => (
                  <li key={i} className="rounded-xl border border-line p-3 text-sm">
                    <p className="font-semibold">{v.term}</p>
                    <p className="text-muted">{v.meaning}</p>
                    {v.examples.length > 0 && (
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        {v.examples.map((e, k) => (
                          <li key={k}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ))}

          <p className="text-xs text-muted">Suggestions come from an AI and can be wrong. You decide what to keep.</p>
        </div>
      )}
    </section>
  );
};

export default WritingAssistant;
