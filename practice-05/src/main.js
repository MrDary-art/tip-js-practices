import { ApiError, buildUrl, createApiClient } from "./api-client.js";
import { createTaskApi } from "./task-api.js";
import { variantFilters, variantNumber } from "./variant.js";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:5505/api";

function describeError(error) {
  if (!(error instanceof ApiError)) {
    return `Неожиданная ошибка: ${error.message}`;
  }

  const parts = [`Тип: ${error.kind}`, error.message];
  if (error.status !== null) parts.push(`HTTP ${error.status}`);
  if (error.code !== null) parts.push(`Код API: ${error.code}`);
  return parts.join(" · ");
}

try {
  const client = createApiClient({ baseUrl, timeoutMs: 2000 });
  const api = createTaskApi(client);
  const allTasks = await api.getTasks();
  console.log(`Всего задач в API: ${allTasks.meta.total}`);

  const commonFilters = { completed: false, priority: "high" };
  const common = await api.getTasks(commonFilters);
  console.log("Общий контрольный запрос:", buildUrl(baseUrl, "/tasks", commonFilters));
  console.log("Незавершённые задачи высокого приоритета:", common.tasks.map((task) => task.id));

  const startedAt = performance.now();
  const { tasks, categories, meta } = await api.loadInitialData(variantFilters);
  const elapsedMs = performance.now() - startedAt;
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  console.log(`Индивидуальный вариант ${variantNumber}`);
  console.log("URL запроса:", buildUrl(baseUrl, "/tasks", variantFilters));
  console.log("Фильтры:", meta.filters);
  console.log(`Получено задач: ${meta.total}; время: ${elapsedMs.toFixed(1)} мс`);
  console.log(`Получено категорий: ${categories.length}`);
  console.table(tasks.map((task) => ({
    id: task.id,
    title: task.title,
    completed: task.completed,
    priority: task.priority,
    category: categoryNames.get(task.categoryId) ?? "Неизвестно",
  })));

  try {
    await api.getTaskById(999);
  } catch (error) {
    console.log("Контрольная ошибка 404:", describeError(error));
  }
} catch (error) {
  console.error(describeError(error));
  console.error(`Проверяемый адрес API: ${baseUrl}`);
  process.exitCode = 1;
}
