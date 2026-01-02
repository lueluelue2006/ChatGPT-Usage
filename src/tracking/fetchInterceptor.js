export function installFetchInterceptor(modelRouting) {
  const targetWindow = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
  const originalFetch = targetWindow.fetch;

  if (originalFetch?.__chatgptUsagePatched) return;

  const wrapped = new Proxy(originalFetch, {
    apply: async function (target, thisArg, args) {
      let autoRequestId = null;

      try {
        const [requestInfo, requestInit] = args;
        const fetchUrl =
          typeof requestInfo === "string" ? requestInfo : requestInfo?.href || requestInfo?.url || "";
        const requestMethod =
          typeof requestInfo === "object" && requestInfo?.method ? requestInfo.method : requestInit?.method || "GET";

        if (
          requestMethod === "PATCH" &&
          fetchUrl?.includes("/backend-api/settings/user_last_used_model_config")
        ) {
          modelRouting.updateLastSelectedModelConfigFromUrl(fetchUrl);
        }

        if (requestMethod === "POST" && /\/conversation(?:\?|$)/.test(fetchUrl || "")) {
          const bodyText = requestInit?.body;
          if (typeof bodyText === "string") {
            const bodyObj = JSON.parse(bodyText);
            if (bodyObj?.model) {
              autoRequestId = modelRouting.handleConversationRequest(bodyObj.model);
            }
          }
        }
      } catch {
        // ignore
      }

      const response = await target.apply(thisArg, args);

      if (autoRequestId) {
        modelRouting.attachAutoSseParser(autoRequestId, response);
      }

      return response;
    },
  });

  wrapped.__chatgptUsagePatched = true;
  targetWindow.fetch = wrapped;
}

