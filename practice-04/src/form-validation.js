const ALLOWED_PRIORITIES = new Set(["low", "medium", "high"]);

// Чистая проверка данных формы. DOM и показ сообщений выполняются в main.js.
// draft: { id, title, priority }; editingId: null либо id редактируемой задачи.
export function validateTaskDraft(draft, tasks, editingId = null) {
  const errors = {};
  const isEditing = editingId !== null;
  const rawId = draft?.id;
  const id = isEditing ? editingId
    : (typeof rawId === "string" || typeof rawId === "number" ? Number(rawId) : NaN);

  if (!Number.isSafeInteger(id) || id <= 0) {
    errors.id = "Введите положительный безопасный целый идентификатор.";
  } else {
    const exists = tasks.some((task) => task.id === id);
    if (isEditing && !exists) errors.id = `Задача с id ${id} не найдена.`;
    if (!isEditing && exists) errors.id = `Задача с id ${id} уже существует.`;
  }

  const title = typeof draft?.title === "string" ? draft.title.trim() : "";
  if (title.length < 1 || title.length > 100) {
    errors.title = "Название после удаления пробелов по краям должно содержать от 1 до 100 символов.";
  }
  const priority = draft?.priority;
  if (!ALLOWED_PRIORITIES.has(priority)) {
    errors.priority = "Выберите приоритет: low, medium или high.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { id, title, priority } };
}
