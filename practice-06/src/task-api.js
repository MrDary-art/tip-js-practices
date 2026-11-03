import { ApiError } from "./api-client.js";

const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);
const ALLOWED_FILTERS = new Set(["completed", "priority", "categoryId", "q"]);

function invalidResponse(message) {
  return new ApiError(message, { kind: "invalid-response" });
}

function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function isTask(value) {
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

export function isCategory(value) {
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

  async function getTasks(filters = {}, { signal } = {}) {
    const query = normalizeFilters(filters);
    const payload = await client.requestJson("/tasks", { query, ...(signal ? { signal } : {}) });
    const tasks = checkCollection(payload, isTask, "задач");
    if (!payload.meta.filters || typeof payload.meta.filters !== "object"
      || Array.isArray(payload.meta.filters)) {
      throw invalidResponse("В ответе задач отсутствует meta.filters.");
    }
    return { tasks, meta: payload.meta };
  }

  async function getTaskById(id, { signal } = {}) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("Неверный id задачи.");
    const payload = await client.requestJson(`/tasks/${id}`, signal ? { signal } : undefined);
    if (!payload || !isTask(payload.data) || payload.data.id !== id) {
      throw invalidResponse("Ответ содержит неверную задачу.");
    }
    return payload.data;
  }

  async function getCategories({ signal } = {}) {
    const payload = await client.requestJson("/categories", signal ? { signal } : undefined);
    return checkCollection(payload, isCategory, "категорий");
  }

  async function loadInitialData(filters = {}, options = {}) {
    const [taskResult, categories] = await Promise.all([
      getTasks(filters, options),
      getCategories(options),
    ]);
    return { tasks: taskResult.tasks, categories, meta: taskResult.meta };
  }

  function checkedTask(payload) {
    if (!payload || !isTask(payload.data)) throw invalidResponse("Ответ содержит неверную задачу.");
    return payload.data;
  }

  async function createTask(draft, { signal } = {}) {
    const payload = await client.requestJson("/tasks", {
      method: "POST", body: draft, ...(signal ? { signal } : {}),
    });
    return checkedTask(payload);
  }

  async function updateTask(id, changes, { signal } = {}) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("Неверный id задачи.");
    const payload = await client.requestJson(`/tasks/${id}`, {
      method: "PATCH", body: changes, ...(signal ? { signal } : {}),
    });
    const result = checkedTask(payload);
    if (result.id !== id) throw invalidResponse("Сервер вернул другую задачу.");
    return result;
  }

  async function setTaskCompleted(id, completed, options = {}) {
    if (typeof completed !== "boolean") throw new TypeError("completed должен быть логическим значением.");
    return updateTask(id, { completed }, options);
  }

  async function deleteTask(id, { signal } = {}) {
    if (!isPositiveSafeInteger(id)) throw new TypeError("Неверный id задачи.");
    const result = await client.requestJson(`/tasks/${id}`, {
      method: "DELETE", ...(signal ? { signal } : {}),
    });
    if (result !== null) throw invalidResponse("DELETE должен вернуть 204 без тела.");
    return null;
  }

  async function resetDemoData({ signal } = {}) {
    const payload = await client.requestJson("/debug/reset", {
      method: "POST", ...(signal ? { signal } : {}),
    });
    if (!payload || payload.data?.reset !== true
      || !Number.isSafeInteger(payload.data.total) || payload.data.total < 0) {
      throw invalidResponse("Неверный ответ сброса данных.");
    }
    return payload.data;
  }

  return {
    getTasks, getTaskById, getCategories, loadInitialData,
    createTask, updateTask, setTaskCompleted, deleteTask, resetDemoData,
  };
}
