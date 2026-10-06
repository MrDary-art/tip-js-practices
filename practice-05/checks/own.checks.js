import assert from "node:assert/strict";
import { createApiServer } from "../api/server.mjs";
import { ApiError, buildUrl, createApiClient } from "../src/api-client.js";
import { createTaskApi } from "../src/task-api.js";
import { loadPartialData } from "../src/partial-load.js";
import { variantFilters } from "../src/variant.js";

let passed = 0;
async function check(name, action) {
  await action();
  passed += 1;
  console.log(`OK: ${name}`);
}

const server = createApiServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/api`;
const client = createApiClient({ baseUrl });
const api = createTaskApi(client);

try {
  await check("вариант 6: categoryId=2 даёт шесть ожидаемых id", async () => {
    const { tasks, meta } = await api.getTasks(variantFilters);
    assert.deepEqual(tasks.map(({ id }) => id), [4, 16, 22, 25, 28, 34]);
    assert.equal(meta.total, 6);
  });

  await check("новая комбинация фильтров и кодирование кириллицы с &", async () => {
    const url = buildUrl(baseUrl, "/tasks", {
      categoryId: 2, completed: false, q: "API & ошибки",
    });
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("q"), "API & ошибки");
    assert.equal(parsed.searchParams.get("completed"), "false");
    assert.equal(parsed.searchParams.get("categoryId"), "2");
    const { tasks } = await api.getTasks({ categoryId: 2, completed: false, q: "API" });
    assert.deepEqual(tasks.map(({ id }) => id), [28]);
  });

  await check("дополнительная HTTP-ошибка 418 сохраняет статус и код", async () => {
    const custom = createApiClient({ baseUrl, fetchFn: async () => new Response(
      JSON.stringify({ error: { code: "TEAPOT", message: "Тестовая ошибка" } }),
      { status: 418, headers: { "Content-Type": "application/json" } },
    ) });
    await assert.rejects(() => custom.requestJson("/tasks"), (error) =>
      error instanceof ApiError && error.kind === "http"
      && error.status === 418 && error.code === "TEAPOT");
  });

  await check("повторяющийся id категории отклоняется", async () => {
    const broken = createTaskApi({
      async requestJson() {
        return { data: [{ id: 1, name: "A" }, { id: 1, name: "B" }], meta: { total: 2 } };
      },
    });
    await assert.rejects(() => broken.getCategories(), (error) =>
      error instanceof ApiError && error.kind === "invalid-response");
  });

  const taskData = { tasks: [{ id: 1 }], meta: { total: 1 } };
  const categories = [{ id: 2 }];
  const failure = new ApiError("Нет связи", { kind: "network" });
  for (const [label, taskFails, categoryFails] of [
    ["оба запроса успешны", false, false],
    ["ошибка задач сохраняет категории", true, false],
    ["ошибка категорий сохраняет задачи", false, true],
    ["две ошибки возвращаются вместе", true, true],
  ]) {
    await check(`дополнительное задание: ${label}`, async () => {
      const partial = await loadPartialData({
        async getTasks() { if (taskFails) throw failure; return taskData; },
        async getCategories() { if (categoryFails) throw failure; return categories; },
      });
      assert.deepEqual(partial.tasks, taskFails ? null : taskData.tasks);
      assert.deepEqual(partial.categories, categoryFails ? null : categories);
      assert.equal(partial.errors.tasks?.kind ?? null, taskFails ? "network" : null);
      assert.equal(partial.errors.categories?.kind ?? null, categoryFails ? "network" : null);
    });
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log(`Итог собственных проверок: успешно ${passed}, ошибок 0.`);
