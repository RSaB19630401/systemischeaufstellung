// functions/api/chat.js — Claude-Proxy (Cloudflare Pages Function)
//
// Modell-Konfiguration: im Pages-Projekt unter
//   Settings → Variables and Secrets  (Production + Preview)
//   CLAUDE_MODEL           primäres Modell, z. B. claude-sonnet-5-5
//   CLAUDE_MODEL_FALLBACK  Ausweichmodell, z. B. claude-sonnet-4-6
//   ANTHROPIC_API_KEY      (Secret, bereits vorhanden)
//
// Fallback greift NUR bei "Modell nicht gefunden" (404 / not_found_error), einmal, mit Log-Warnung.

const MODEL_DEFAULT = "claude-sonnet-4-6";

// Modellspezifische Parameter – damit die Antworten wie bisher ausfallen:
//  • Sonnet 5.5 / Haiku 5.5 denken sonst standardmäßig vorab mit (kostet Tokens, zählt gegen
//    max_tokens, und die Antwort beginnt dann mit einem thinking-Block statt mit Text).
//  • Die 5er-Modelle zählen denselben Text als ca. 30 % mehr Tokens → Limit wird mitgezogen
//    (berechnet werden nur tatsächlich erzeugte Tokens).
function modelParams(model, maxTokens) {
  const p = {};
  if (/^claude-sonnet-5-5/.test(model)) p.thinking = { type: "between_tools" };
  else if (/^claude-haiku-5/.test(model)) p.thinking = { type: "disabled" };
  if (/^claude-(sonnet|haiku|opus)-5/.test(model) && maxTokens) p.max_tokens = Math.ceil(maxTokens * 1.3);
  return p;
}

async function anthropicFetch(apiKey, payloadBase, env) {
  const primary  = (env && env.CLAUDE_MODEL)         || MODEL_DEFAULT;
  const fallback = (env && env.CLAUDE_MODEL_FALLBACK) || MODEL_DEFAULT;
  const call = (model) => fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ ...payloadBase, ...modelParams(model, payloadBase.max_tokens), model }),
  });
  let resp = await call(primary);
  let used = primary;
  if (resp.status === 404 && fallback && fallback !== primary) {
    let modelMissing = true;
    try {
      const j = await resp.clone().json();
      modelMissing = !j || !j.error || j.error.type === "not_found_error";
    } catch (_) {}
    if (modelMissing) {
      console.warn(`[CLAUDE] Modell '${primary}' nicht gefunden – Fallback auf '${fallback}'.`);
      resp = await call(fallback);
      used = fallback;
    }
  }
  return { resp, used };
}

export async function onRequestPost(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const body = await context.request.json();
    const apiKey = context.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { resp, used } = await anthropicFetch(apiKey, {
      max_tokens: 2000,
      system: body.system || "",
      messages: body.messages,
    }, context.env);

    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      status: resp.status,
      headers: { "Content-Type": "application/json", "X-Model-Used": used, ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
