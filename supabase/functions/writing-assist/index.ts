// Supabase Edge Function: the writing assistant for the diary.
//
// The browser sends diary text here ONLY when the person presses a button. This function
// checks they are signed in, then asks an AI model for help. The AI key lives in
// Supabase secrets, never in the browser.
//
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...        (required)
//   supabase secrets set ANTHROPIC_MODEL=claude-sonnet-5-5   (optional)
//   supabase functions deploy writing-assist
//
// See SETUP.md for the dashboard (no CLI) steps.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handle, type ModelRequest } from "./logic.ts";

const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5";

const getUserId = async (authorization: string | null) => {
  if (!authorization) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : (data.user?.id ?? null);
};

const callModel = async ({ system, user, tool }: ModelRequest) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
      tools: [tool],
      // forcing the tool means we always get structured data back, never free text
      tool_choice: { type: "tool", name: tool.name },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`AI request failed (${response.status})`);
  const data = await response.json();
  const block = (data.content ?? []).find((b: { type: string }) => b.type === "tool_use");
  if (!block) throw new Error("No structured answer");
  return block.input;
};

Deno.serve((req) => handle(req, { configured: Boolean(apiKey), getUserId, callModel }));
