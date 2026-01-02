import { usageData } from "../state.js";
import { recordModelUsageByModelId } from "../usage.js";

function resolveRedirectedModelId(originalModelId) {
  if (originalModelId === "chatgpt_alpha_model_external_access_reserved_gate_13") {
    return "alpha";
  }

  if (originalModelId === "auto") {
    return "gpt-5-2";
  }

  try {
    const plan = (usageData && usageData.planType) || "team";
    if (originalModelId === "gpt-4-5" && plan !== "pro") return "gpt-5-2-instant";
    if (originalModelId === "o3-pro" && plan !== "pro") return "gpt-5-2-instant";
  } catch {
    // ignore
  }

  return originalModelId;
}

export function createModelRouting() {
  const pendingAutoRequests = new Map();
  const seenAssistantMessageIds = new Set();
  let assistantObserverStarted = false;

  let lastSelectedModelConfig = {
    modelSlug: null,
    thinkingEffort: null,
    updatedAt: 0,
  };

  function parseUrl(urlLike) {
    try {
      return new URL(urlLike, location.origin);
    } catch {
      return null;
    }
  }

  function updateLastSelectedModelConfigFromUrl(urlLike) {
    const url = parseUrl(urlLike);
    if (!url) return;

    const modelSlug = url.searchParams.get("model_slug") || url.searchParams.get("model");
    const thinkingEffort = url.searchParams.get("thinking_effort") || url.searchParams.get("effort");

    if (!modelSlug && !thinkingEffort) return;

    lastSelectedModelConfig = {
      modelSlug: modelSlug ?? lastSelectedModelConfig.modelSlug,
      thinkingEffort: thinkingEffort ?? lastSelectedModelConfig.thinkingEffort,
      updatedAt: Date.now(),
    };
  }

  function getOldestUnresolvedAutoRequest() {
    let oldest = null;
    for (const [id, req] of pendingAutoRequests.entries()) {
      if (req.resolved) continue;
      if (!oldest || req.startedAt < oldest.startedAt) oldest = { id, ...req };
    }
    return oldest;
  }

  function mapRoutedSlugToModelKey(baseModelKey, routedModelSlug, didAutoSwitchToReasoning) {
    const slug = (routedModelSlug || "").toLowerCase();

    if (baseModelKey === "gpt-5-2") {
      if (slug.includes("pro")) return "gpt-5-2-pro";
      const looksReasoning =
        didAutoSwitchToReasoning === true || slug.includes("thinking") || slug.includes("reasoning");
      return looksReasoning ? "gpt-5-2-thinking" : "gpt-5-2-instant";
    }

    return routedModelSlug || baseModelKey;
  }

  function resolveAutoRequest(requestId, routed) {
    const req = pendingAutoRequests.get(requestId);
    if (!req || req.resolved) return;

    const modelKey = mapRoutedSlugToModelKey(
      req.baseModelKey,
      routed?.modelSlug,
      routed?.didAutoSwitchToReasoning,
    );

    req.resolved = true;
    req.resolvedAt = Date.now();
    req.routed = routed;

    recordModelUsageByModelId(modelKey);
  }

  async function parseSseFromResponse(response, onJson) {
    const body = response?.body;
    if (!body || typeof body.getReader !== "function") return;

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      let sepIdx;
      while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);

        const dataLines = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart());

        if (!dataLines.length) continue;

        const data = dataLines.join("\n");
        if (!data || data === "[DONE]") continue;

        try {
          onJson(JSON.parse(data));
        } catch {
          // ignore non-JSON payloads
        }
      }
    }
  }

  function extractRoutingInfo(json) {
    if (!json || typeof json !== "object") return null;

    const ste =
      json.server_ste_metadata && typeof json.server_ste_metadata === "object"
        ? json.server_ste_metadata
        : json;

    if (ste && (ste.type === "server_ste_metadata" || json.type === "server_ste_metadata")) {
      const modelSlug = ste.model_slug || ste.model || ste.modelSlug;
      const didAutoSwitchToReasoning = ste.did_auto_switch_to_reasoning ?? ste.didAutoSwitchToReasoning;
      const thinkingEffort = ste.thinking_effort ?? ste.thinkingEffort ?? ste.effort;

      if (modelSlug || didAutoSwitchToReasoning !== undefined || thinkingEffort) {
        return { source: "sse", modelSlug, didAutoSwitchToReasoning, thinkingEffort };
      }
    }

    const message = json.message && typeof json.message === "object" ? json.message : null;
    const metadata = message?.metadata && typeof message.metadata === "object" ? message.metadata : null;
    const modelSlug = metadata?.model_slug || metadata?.modelSlug;
    const thinkingEffort = metadata?.thinking_effort || metadata?.thinkingEffort;
    if (modelSlug || thinkingEffort) {
      return { source: "sse-message", modelSlug, thinkingEffort };
    }

    return null;
  }

  function attachAutoSseParser(requestId, response) {
    try {
      const clone = response.clone();
      parseSseFromResponse(clone, (json) => {
        const info = extractRoutingInfo(json);
        if (info) resolveAutoRequest(requestId, info);
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  function startAssistantMessageObserver() {
    if (assistantObserverStarted) return;
    assistantObserverStarted = true;

    const start = () => {
      if (!document?.body) {
        setTimeout(start, 300);
        return;
      }

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) continue;

            const candidates = [];
            if (node.matches?.('[data-message-author-role="assistant"]')) candidates.push(node);
            node
              .querySelectorAll?.('[data-message-author-role="assistant"]')
              .forEach((el) => candidates.push(el));

            for (const el of candidates) {
              const msgId = el.getAttribute("data-message-id") || el.id || null;
              if (msgId && seenAssistantMessageIds.has(msgId)) continue;
              if (msgId) seenAssistantMessageIds.add(msgId);

              const modelSlug = el.getAttribute("data-message-model-slug");
              if (!modelSlug) continue;

              const oldest = getOldestUnresolvedAutoRequest();
              if (!oldest) continue;

              const ageMs = Date.now() - oldest.startedAt;
              if (ageMs < 0 || ageMs > 2 * 60 * 1000) continue;

              resolveAutoRequest(oldest.id, { source: "dom", modelSlug });
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    };

    start();
  }

  function beginAutoRequest(requestedModelId, baseModelKey = "gpt-5-2") {
    startAssistantMessageObserver();

    const requestId =
      (crypto?.randomUUID && crypto.randomUUID()) ||
      `auto_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    pendingAutoRequests.set(requestId, {
      baseModelKey,
      requestedModel: requestedModelId,
      startedAt: Date.now(),
      resolved: false,
      lastSelectedModelConfig: { ...lastSelectedModelConfig },
    });

    setTimeout(() => {
      const req = pendingAutoRequests.get(requestId);
      if (!req || req.resolved) return;
      resolveAutoRequest(requestId, {
        source: "timeout",
        modelSlug: req.baseModelKey,
        didAutoSwitchToReasoning: false,
      });
    }, 60 * 1000);

    return requestId;
  }

  function handleConversationRequest(modelId) {
    const effectiveModelId = resolveRedirectedModelId(modelId);

    if (effectiveModelId === "gpt-5-instant") {
      recordModelUsageByModelId("gpt-5");
      return null;
    }
    if (effectiveModelId === "gpt-5-1-instant") {
      recordModelUsageByModelId("gpt-5-1");
      return null;
    }

    if (effectiveModelId === "gpt-5-2") {
      return beginAutoRequest(modelId, "gpt-5-2");
    }

    recordModelUsageByModelId(resolveRedirectedModelId(effectiveModelId));
    return null;
  }

  return {
    handleConversationRequest,
    attachAutoSseParser,
    updateLastSelectedModelConfigFromUrl,
  };
}

