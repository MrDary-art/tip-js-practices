export class ApiError extends Error {
  constructor(message, {
    kind,
    status = null,
    code = null,
    details = null,
    url = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.details = details;
    this.url = url;
  }
}

// Создаёт URL относительно baseUrl и добавляет непустые параметры query.
// Значения кодируются средствами URL и URLSearchParams, а не вручную.
export function buildUrl(baseUrl, path, query = {}) {
  let base;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new TypeError("baseUrl должен быть абсолютным адресом HTTP(S).");
  }
  if (!["http:", "https:"].includes(base.protocol) || base.search || base.hash) {
    throw new TypeError("baseUrl должен быть адресом HTTP(S) без query и hash.");
  }
  if (typeof path !== "string" || !path.trim() || /^[a-z][a-z\d+.-]*:/i.test(path)
    || path.includes("?") || path.includes("#")) {
    throw new TypeError("path должен быть непустым относительным путём без query и hash.");
  }
  if (query === null || typeof query !== "object" || Array.isArray(query)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(query))) {
    throw new TypeError("query должен быть обычным объектом.");
  }

  base.pathname = `${base.pathname.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      base.searchParams.append(key, String(value));
    }
  }
  return base.toString();
}

// fetchFn передаётся явно, чтобы модуль можно было проверить без реальной сети.
// Возвращаемый объект: { requestJson(path, { query, signal, timeoutMs } = {}) }.
export function createApiClient({
  baseUrl,
  fetchFn = globalThis.fetch,
  timeoutMs = 2000,
} = {}) {
  const normalizedBaseUrl = buildUrl(baseUrl, "/").replace(/\/$/, "");
  if (typeof fetchFn !== "function" || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("Нужны fetchFn и положительный целый timeoutMs.");
  }

  return {
    async requestJson(path, { query, signal, timeoutMs: requestTimeoutMs = timeoutMs } = {}) {
      if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
        throw new TypeError("timeoutMs должен быть положительным целым числом.");
      }
      if (signal !== undefined && !(signal instanceof AbortSignal)) {
        throw new TypeError("signal должен быть AbortSignal.");
      }
      const url = buildUrl(normalizedBaseUrl, path, query);
      const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
      const combinedSignal = signal
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;

      let response;
      try {
        response = await fetchFn(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: combinedSignal,
        });
      } catch (cause) {
        const kind = signal?.aborted ? "aborted" : timeoutSignal.aborted ? "timeout" : "network";
        const message = kind === "timeout" ? "Превышено время ожидания ответа."
          : kind === "aborted" ? "Запрос отменён."
            : "Не удалось связаться с сервером.";
        throw new ApiError(message, { kind, url, cause });
      }

      if (!(response instanceof Response)) {
        throw new ApiError("Сервер вернул неверный объект ответа.", {
          kind: "invalid-response", url,
        });
      }

      const contentType = response.headers.get("content-type") ?? "";
      const isJson = /^application\/(?:[\w.-]+\+)?json(?:\s*;|\s*$)/i.test(contentType);
      if (!response.ok) {
        let errorPayload;
        if (isJson) {
          try { errorPayload = await response.json(); } catch { /* Статус важнее тела ошибки. */ }
        }
        const detail = errorPayload?.error;
        throw new ApiError(
          typeof detail?.message === "string" ? detail.message : `HTTP ${response.status}`,
          {
            kind: "http", status: response.status,
            code: typeof detail?.code === "string" ? detail.code : null,
            details: detail?.details ?? null,
            url,
          },
        );
      }
      if (response.status === 204) return null;
      if (!isJson) {
        throw new ApiError("Ожидался JSON-ответ сервера.", {
          kind: "invalid-response", url,
        });
      }
      try {
        return await response.json();
      } catch (cause) {
        throw new ApiError("Не удалось разобрать JSON-ответ сервера.", {
          kind: "invalid-response", url, cause,
        });
      }
    },
  };
}
