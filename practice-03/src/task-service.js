// По контракту tasks — корректный массив задач с уникальными id.
// Здесь проверяются новые данные; исходные массивы и объекты не изменяются.

const isValidId = (id) => Number.isSafeInteger(id) && id > 0;

function getTitleError(title) {
  if (typeof title !== "string") {
    return "Название должно быть строкой.";
  }
  const length = title.trim().length;
  if (length < 1 || length > 100) {
    return "Название после удаления краевых пробелов должно содержать от 1 до 100 символов.";
  }
  return null;
}

export function createTask(id, title, priority = "medium") {
  if (!isValidId(id)) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом." };
  }
  const titleError = getTitleError(title);
  if (titleError !== null) {
    return { ok: false, error: titleError };
  }
  if (priority !== "low" && priority !== "medium" && priority !== "high") {
    return { ok: false, error: "Приоритет должен быть low, medium или high." };
  }
  return {
    ok: true,
    task: { id, title: title.trim(), completed: false, priority },
  };
}

export function findTaskById(tasks, id) {
  return tasks.find((task) => task.id === id);
}

export function getPendingTasks(tasks) {
  return tasks.filter((task) => task.completed === false);
}

export function getTaskTitles(tasks) {
  return tasks.map((task) => task.title);
}

export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed === true).length;
  const pending = total - completed;
  const progress = total === 0 ? 0 : completed / total * 100;
  return { total, completed, pending, progress };
}

export function addTask(tasks, id, title, priority = "medium") {
  const result = createTask(id, title, priority);
  if (!result.ok) {
    return result;
  }
  if (findTaskById(tasks, id) !== undefined) {
    return { ok: false, error: `Задача с id ${id} уже существует.` };
  }
  return { ok: true, tasks: [...tasks, result.task] };
}

export function setTaskCompleted(tasks, id, completed) {
  if (!isValidId(id)) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом." };
  }
  if (typeof completed !== "boolean") {
    return { ok: false, error: "Статус выполнения должен быть true или false." };
  }
  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id ${id} не найдена.` };
  }
  return {
    ok: true,
    tasks: tasks.map((task) => task.id === id ? { ...task, completed } : task),
  };
}

export function renameTask(tasks, id, title) {
  if (!isValidId(id)) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом." };
  }
  const titleError = getTitleError(title);
  if (titleError !== null) {
    return { ok: false, error: titleError };
  }
  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id ${id} не найдена.` };
  }
  const normalizedTitle = title.trim();
  return {
    ok: true,
    tasks: tasks.map((task) => task.id === id ? { ...task, title: normalizedTitle } : task),
  };
}

export function removeTask(tasks, id) {
  if (!isValidId(id)) {
    return { ok: false, error: "id должен быть положительным безопасным целым числом." };
  }
  if (findTaskById(tasks, id) === undefined) {
    return { ok: false, error: `Задача с id ${id} не найдена.` };
  }
  return { ok: true, tasks: tasks.filter((task) => task.id !== id) };
}
