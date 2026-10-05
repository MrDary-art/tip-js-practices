import { getTaskStats } from "./task-service.js";

// Здесь создаётся DOM, но не изменяется состояние приложения.
// Контракт карточки, селекторы и тексты описаны в методичке.
export function createTaskElement(task) {
  const card = document.createElement("li");
  card.classList.add("task-card");
  card.classList.toggle("is-completed", task.completed);
  card.dataset.taskId = String(task.id);

  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;

  const status = document.createElement("span");
  status.className = "task-status";
  status.textContent = task.completed ? "Выполнена" : "В работе";

  const priorityLabels = { low: "Низкий", medium: "Средний", high: "Высокий" };
  const priority = document.createElement("span");
  priority.className = "task-priority";
  priority.textContent = priorityLabels[task.priority];

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const toggleButton = createActionButton("toggle", "Выполнена");
  toggleButton.setAttribute("aria-pressed", String(task.completed));
  actions.append(
    toggleButton,
    createActionButton("edit", "Изменить"),
    createActionButton("delete", "Удалить"),
  );
  card.append(title, status, priority, actions);
  return card;
}

function createActionButton(action, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = action;
  const text = document.createElement("span");
  text.className = "action-label";
  text.textContent = label;
  button.append(text);
  return button;
}

export function renderTaskList(listElement, tasks) {
  // Меняются только карточки; контейнер и его обработчик сохраняются.
  listElement.replaceChildren(...tasks.map(createTaskElement));
}

export function renderSummary(summaryElement, tasks, visibleCount) {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  const values = { total, completed, pending, progress: `${progress.toFixed(1)}%`, visible: visibleCount };
  for (const [name, value] of Object.entries(values)) {
    summaryElement.querySelector(`[data-stat="${name}"]`).textContent = String(value);
  }
}

export function renderEmptyState(messageElement, total, visibleCount) {
  if (total === 0) {
    messageElement.textContent = "Список задач пуст.";
  } else if (visibleCount === 0) {
    messageElement.textContent = "Нет задач по выбранному фильтру.";
  } else {
    messageElement.textContent = "";
  }
  messageElement.hidden = visibleCount > 0;
}
