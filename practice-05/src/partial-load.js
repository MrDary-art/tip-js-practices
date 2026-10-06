// Дополнительное задание А: независимые результаты не теряются при ошибке соседа.
export async function loadPartialData(api, filters = {}) {
  if (!api || typeof api.getTasks !== "function" || typeof api.getCategories !== "function") {
    throw new TypeError("Нужны методы getTasks и getCategories.");
  }

  const [taskResult, categoryResult] = await Promise.allSettled([
    api.getTasks(filters),
    api.getCategories(),
  ]);
  const describe = (reason) => ({
    kind: reason?.kind ?? "unexpected",
    message: reason?.message ?? String(reason),
    status: reason?.status ?? null,
  });

  return {
    tasks: taskResult.status === "fulfilled" ? taskResult.value.tasks : null,
    meta: taskResult.status === "fulfilled" ? taskResult.value.meta : null,
    categories: categoryResult.status === "fulfilled" ? categoryResult.value : null,
    errors: {
      tasks: taskResult.status === "rejected" ? describe(taskResult.reason) : null,
      categories: categoryResult.status === "rejected" ? describe(categoryResult.reason) : null,
    },
  };
}
