const PRIORITY_LABELS = Object.freeze({
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
});

export function createTaskElement(task, category) {
  const card = document.createElement("li");
  card.className = `task-card${task.completed ? " is-completed" : ""}`;
  card.dataset.taskId = String(task.id);

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";
  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = task.completed ? "Выполнено" : "В работе";
  const priority = document.createElement("span");
  priority.className = "task-priority";
  priority.textContent = `Приоритет: ${PRIORITY_LABELS[task.priority] ?? task.priority}`;
  const categoryName = document.createElement("span");
  categoryName.className = "task-category";
  categoryName.textContent = category?.name ?? "Неизвестная категория";
  meta.append(status, priority, categoryName);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  for (const [action, label] of [
    ["toggle", task.completed ? "Вернуть в работу" : "Выполнить"],
    ["edit", "Изменить"],
    ["delete", "Удалить"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    const text = document.createElement("span");
    text.className = "action-label";
    text.textContent = label;
    button.append(text);
    actions.append(button);
  }
  card.append(title, meta, actions);
  return card;
}

export function renderTaskList(list, tasks, categories) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  list.replaceChildren(...tasks.map((task) => createTaskElement(task, byId.get(task.categoryId))));
}
