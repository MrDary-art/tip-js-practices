import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isTask(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.title === "string"
    && value.title.trim().length >= 1
    && value.title.trim().length <= 100
    && typeof value.completed === "boolean"
    && ALLOWED_PRIORITIES.has(value.priority)
    && isPositiveSafeInteger(value.categoryId),
  );
}

function isCategory(value) {
  return Boolean(
    value
    && typeof value === "object"
    && isPositiveSafeInteger(value.id)
    && typeof value.name === "string"
    && value.name.trim().length >= 1
    && value.name.trim().length <= 100,
  );
}

// client — объект, созданный createApiClient.
// Контракт результата:
// getTasks(filters) -> Promise<{ tasks, meta }>
// getTaskById(id) -> Promise<task>
// getCategories() -> Promise<category[]>
// loadInitialData(filters) -> Promise<{ tasks, categories, meta }>
export function createTaskApi(client) {
  if (!client || typeof client.requestJson !== "function") {
    throw new TypeError("client должен иметь метод requestJson.");
  }

  function normalizeFilters(filters) {
    if (!filters || typeof filters !== "object" || Array.isArray(filters)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(filters))) {
      throw new TypeError("Фильтры должны быть обычным объектом.");
    }
    const query = {};
    for (const [key, value] of Object.entries(filters)) {
      if (!ALLOWED_FILTERS.has(key)) throw new TypeError(`Неизвестный фильтр: ${key}`);
      if (key === "completed" && typeof value !== "boolean") {
        throw new TypeError("completed должен быть логическим значением.");
      }
      if (key === "priority" && !ALLOWED_PRIORITIES.has(value)) {
        throw new TypeError("Недопустимый приоритет.");
      }
      if (key === "categoryId" && !isPositiveSafeInteger(value)) {
        throw new TypeError("categoryId должен быть положительным целым числом.");
      }
      if (key === "q") {
        if (typeof value !== "string" || value.trim().length > 100) {
          throw new TypeError("q должен быть строкой длиной до 100 символов.");
        }
        query.q = value.trim();
      } else {
        query[key] = value;
      }
    }
    return query;
  }

  function checkCollection(payload, validator, label) {
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)
      || !payload.meta || typeof payload.meta !== "object"
      || !Number.isSafeInteger(payload.meta.total)
      || payload.meta.total !== payload.data.length) {
      throw invalidResponse(`Неверная коллекция ${label} или meta.total.`);
    }
    const ids = new Set();
    for (const item of payload.data) {
      if (!validator(item) || ids.has(item.id)) {
        throw invalidResponse(`Неверный элемент или повторяющийся id в коллекции ${label}.`);
      }
      ids.add(item.id);
    }
    return payload.data;
  }

  async function getTasks(filters = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query });
    const tasks = checkCollection(payload, isTask, "задач");
    if (!payload.meta.filters || typeof payload.meta.filters !== "object"
      || Array.isArray(payload.meta.filters)) {
      throw invalidResponse("В ответе задач отсутствует meta.filters.");
    }
    return { tasks, meta: payload.meta };
  }

  async function getTaskById(id) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("Неверный id задачи.");
    const payload = await client.requestJson(`/tasks/${id}`);
    if (!payload || !isTask(payload.data) || payload.data.id !== id) {
      throw invalidResponse("Ответ содержит неверную задачу.");
    }
    return payload.data;
  }

  async function getCategories() {
    const payload = await client.requestJson("/categories");
    return checkCollection(payload, isCategory, "категорий");
  }

  async function loadInitialData(filters = {}) {
    const [taskResult, categories] = await Promise.all([
      getTasks(filters),
      getCategories(),
    ]);
    return { tasks: taskResult.tasks, categories, meta: taskResult.meta };
  }

  return { getTasks, getTaskById, getCategories, loadInitialData };
}
