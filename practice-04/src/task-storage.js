export const STORAGE_VERSION = 1;

// Все функции принимают объект storage явно, чтобы их можно было проверить
// без обращения к глобальному window.localStorage.

export function isValidTaskList(value) {
  if (!Array.isArray(value)) return false;
  const ids = new Set();
  for (const task of value) {
    if (task === null || typeof task !== "object" || Array.isArray(task)
        || !Number.isSafeInteger(task.id) || task.id <= 0 || ids.has(task.id)
        || typeof task.title !== "string" || task.title !== task.title.trim()
        || task.title.length < 1 || task.title.length > 100
        || typeof task.completed !== "boolean"
        || !["low", "medium", "high"].includes(task.priority)) {
      return false;
    }
    ids.add(task.id);
  }
  return true;
}

export function loadTasks(storage, key, fallbackTasks) {
  const fallback = fallbackTasks.map((task) => ({ ...task }));
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { ok: true, source: "initial", tasks: fallback };
    const saved = JSON.parse(raw);
    if (saved === null || typeof saved !== "object" || Array.isArray(saved)
        || saved.version !== STORAGE_VERSION || !isValidTaskList(saved.tasks)) {
      return {
        ok: false, source: "fallback", tasks: fallback,
        error: "Сохранённые данные имеют неверную версию или структуру. Загружен исходный набор.",
      };
    }
    return { ok: true, source: "storage", tasks: saved.tasks.map((task) => ({ ...task })) };
  } catch {
    return {
      ok: false, source: "fallback", tasks: fallback,
      error: "Не удалось прочитать сохранённые данные: хранилище недоступно или JSON повреждён. Загружен исходный набор.",
    };
  }
}

export function saveTasks(storage, key, tasks) {
  if (!isValidTaskList(tasks)) {
    return { ok: false, error: "Список задач не соответствует схеме и не был сохранён." };
  }
  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, tasks }));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Не удалось сохранить данные в localStorage. Изменения доступны только до перезагрузки страницы.",
    };
  }
}

export function removeSavedTasks(storage, key) {
  try {
    storage.removeItem(key);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Не удалось удалить сохранённые данные. После перезагрузки может вернуться прежняя запись.",
    };
  }
}
