import { demoTasks, variantNumber, variantTasks } from "./data.js";
import {
  findTaskById,
  getPendingTasks,
  getTaskTitles,
  getTaskStats,
  addTask,
  setTaskCompleted,
  renameTask,
  removeTask,
} from "./task-service.js";

function showStats(tasks) {
  const { total, completed, pending, progress } = getTaskStats(tasks);
  console.log(`Всего: ${total}; выполнено: ${completed}; осталось: ${pending}`);
  if (total === 0) {
    console.log("Задач пока нет");
  } else {
    console.log(`Прогресс: ${progress.toFixed(1)}%`);
  }
}

// Сценарии отличаются данными, но проходят одинаковую последовательность действий.
function runScenario(label, initialTasks, settings) {
  console.log(`\n${label}`);
  // В модели все поля примитивные: копия каждого объекта сохраняет его значения.
  const before = initialTasks.map((task) => ({ ...task }));
  let currentTasks = initialTasks;

  function applyResult(label, result) {
    console.log(`\n${label}`);
    if (result.ok) {
      currentTasks = result.tasks;
    } else {
      console.log(`Отказ: ${result.error}`);
    }
    showStats(currentTasks);
  }

  console.log("Исходные задачи:");
  console.table(currentTasks);
  console.log("Названия:", getTaskTitles(currentTasks));
  console.log("Невыполненные задачи:");
  console.table(getPendingTasks(currentTasks));
  showStats(currentTasks);

  applyResult(`Добавление id ${settings.newId}`,
    addTask(currentTasks, settings.newId, settings.newTitle, settings.newPriority));
  applyResult(`Выполнение id ${settings.completeId}`,
    setTaskCompleted(currentTasks, settings.completeId, true));
  applyResult(`Переименование id ${settings.renameId}`,
    renameTask(currentTasks, settings.renameId, settings.renamedTitle));
  console.log("Переименованная задача:", findTaskById(currentTasks, settings.renameId));
  applyResult(`Удаление id ${settings.removeId}`, removeTask(currentTasks, settings.removeId));

  const beforeFailure = currentTasks;
  const valuesBeforeFailure = JSON.stringify(currentTasks);
  applyResult(`Повторное добавление id ${settings.newId}`,
    addTask(currentTasks, settings.newId, "Повторная задача", settings.newPriority));
  console.log("Состояние после отказа сохранено:",
    currentTasks === beforeFailure && JSON.stringify(currentTasks) === valuesBeforeFailure);

  console.log("Итоговые задачи:");
  console.table(currentTasks);
  console.log("Итоговые id:", currentTasks.map((task) => task.id));
  showStats(currentTasks);
  console.log("Исходные данные сохранены:", JSON.stringify(initialTasks) === JSON.stringify(before));
}

runScenario("Общий сценарий", demoTasks, {
  newId: 20,
  newTitle: "Добавить проверку",
  newPriority: "high",
  completeId: 4,
  renameId: 10,
  renamedTitle: "Подготовить инструкцию запуска",
  removeId: 7,
});

runScenario(`Индивидуальный вариант ${variantNumber}: проверка пользовательского интерфейса`, variantTasks, {
  newId: 80,
  newTitle: "Проверить подсказки интерфейса",
  newPriority: "low",
  completeId: 11,
  renameId: 23,
  renamedTitle: "Проверить обязательные поля формы",
  removeId: 37,
});
