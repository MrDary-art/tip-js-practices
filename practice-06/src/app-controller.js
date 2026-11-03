import { ApiError } from "./api-client.js";
import { validateTaskDraft } from "./form-validation.js";

export function messageForError(error) {
  if (!(error instanceof ApiError)) return "Не удалось выполнить операцию.";
  if (error.kind === "timeout") return "Сервер не ответил вовремя. Попробуйте ещё раз.";
  if (error.kind === "network") return "Нет соединения с учебным API. Проверьте, запущен ли npm start.";
  if (error.kind === "invalid-response") return "Сервер вернул ответ неожиданного формата.";
  if (error.kind === "http" && error.status === 404) return "Запись уже отсутствует на сервере. Обновите список.";
  if (error.kind === "http") return error.message || `Сервер вернул ошибку ${error.status}.`;
  return "Не удалось выполнить операцию.";
}

// view — адаптер из dom-app.js. Контроллер не должен обращаться к document.
// Обязательные методы результата:
// start, applyFilters, refresh, submit, beginEdit, cancelEdit,
// toggleTask, deleteTask, resetData и destroy.
export function createAppController({ api, view, validateDraft = validateTaskDraft } = {}) {
  const apiMethods = ["loadInitialData", "getTasks", "createTask", "updateTask",
    "setTaskCompleted", "deleteTask", "resetDemoData"];
  const viewMethods = ["setListState", "setTasks", "setCategories", "setTotal",
    "setFormTask", "showFormErrors", "setMutationPending", "notify"];
  if (!api || !apiMethods.every((name) => typeof api[name] === "function")
    || !view || !viewMethods.every((name) => typeof view[name] === "function")
    || typeof validateDraft !== "function") {
    throw new TypeError("Нужны методы api, view и функция проверки формы.");
  }

  let tasks = [];
  let categories = null;
  let filters = {};
  let editingId = null;
  let activeLoad = null;
  let loadNumber = 0;
  let mutationPending = false;
  let destroyed = false;

  async function loadCurrentTasks() {
    if (destroyed) return false;
    activeLoad?.abort();
    const controller = new AbortController();
    activeLoad = controller;
    const number = ++loadNumber;
    view.setListState("loading");

    try {
      const result = categories === null
        ? await api.loadInitialData(filters, { signal: controller.signal })
        : await api.getTasks(filters, { signal: controller.signal });
      if (destroyed || number !== loadNumber || controller.signal.aborted) return false;

      if (categories === null) {
        categories = result.categories;
        view.setCategories(categories);
      }
      tasks = result.tasks;
      view.setTasks(tasks, categories);
      view.setTotal(result.meta.total);
      view.setListState(tasks.length ? "ready" : "empty");
      if (editingId !== null && !tasks.some((task) => task.id === editingId)) {
        cancelEdit();
      }
      return true;
    } catch (error) {
      if (destroyed || number !== loadNumber || controller.signal.aborted
        || (error instanceof ApiError && error.kind === "aborted")) return false;
      view.setListState("error", messageForError(error));
      return false;
    } finally {
      if (activeLoad === controller) activeLoad = null;
    }
  }

  function start(initialFilters = {}) {
    filters = { ...initialFilters };
    view.setFormTask(null);
    view.showFormErrors({});
    return loadCurrentTasks();
  }

  function applyFilters(nextFilters = {}) {
    filters = { ...nextFilters };
    return loadCurrentTasks();
  }

  function refresh() {
    return loadCurrentTasks();
  }

  function cancelEdit() {
    editingId = null;
    view.setFormTask(null);
    view.showFormErrors({});
  }

  function beginEdit(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task || mutationPending || destroyed) return false;
    editingId = id;
    view.setFormTask(task);
    view.showFormErrors({});
    return true;
  }

  async function mutate(action, successMessage, clearForm = false) {
    if (destroyed || mutationPending) return false;
    mutationPending = true;
    activeLoad?.abort();
    loadNumber += 1;
    view.setMutationPending(true);
    view.notify("");
    try {
      await action();
      if (clearForm) cancelEdit();
      const loaded = await loadCurrentTasks();
      if (loaded) view.notify(successMessage, "success");
      return loaded;
    } catch (error) {
      if (!(error instanceof ApiError && error.kind === "aborted")) {
        view.notify(messageForError(error), "error");
      }
      return false;
    } finally {
      mutationPending = false;
      view.setMutationPending(false);
    }
  }

  async function submit(draft) {
    if (destroyed || mutationPending) return false;
    const checked = validateDraft(draft, categories);
    view.showFormErrors(checked.errors);
    if (!checked.valid) return false;
    const id = editingId;
    return mutate(
      () => id === null
        ? api.createTask(checked.value)
        : api.updateTask(id, checked.value),
      id === null ? "Задача добавлена." : "Задача изменена.",
      true,
    );
  }

  function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return Promise.resolve(false);
    return mutate(
      () => api.setTaskCompleted(id, !task.completed),
      "Статус задачи изменён.",
    );
  }

  function deleteTask(id) {
    if (!tasks.some((item) => item.id === id)) return Promise.resolve(false);
    return mutate(() => api.deleteTask(id), "Задача удалена.", editingId === id);
  }

  function resetData() {
    return mutate(() => api.resetDemoData(), "Учебные данные восстановлены.", true);
  }

  function destroy() {
    destroyed = true;
    loadNumber += 1;
    activeLoad?.abort();
    activeLoad = null;
  }

  return {
    start, applyFilters, refresh, submit, beginEdit, cancelEdit,
    toggleTask, deleteTask, resetData, destroy,
  };
}
