// Общий контрольный набор. Для своего варианта ниже предусмотрен отдельный массив.
// Идентификатор задачи не совпадает с её индексом в массиве.
export const demoTasks = [
  { id: 1, title: "Изучить функции", completed: true, priority: "medium" },
  { id: 4, title: "Подготовить модель задач", completed: false, priority: "high" },
  { id: 7, title: "Проверить методы массивов", completed: false, priority: "low" },
  { id: 10, title: "Оформить README", completed: true, priority: "medium" },
];

// Вариант 6: проверка пользовательского интерфейса. Номер в журнале — 22.
// По методичке изначально выполнены первые пять задач.
export const variantNumber = 6;
export const variantTasks = [
  { id: 11, title: "Проверить навигацию интерфейса", completed: true, priority: "high" },
  { id: 23, title: "Проверить поля формы", completed: true, priority: "medium" },
  { id: 37, title: "Проверить сообщения об ошибках", completed: true, priority: "low" },
  { id: 41, title: "Проверить адаптивность страницы", completed: true, priority: "high" },
  { id: 58, title: "Проверить управление с клавиатуры", completed: true, priority: "medium" },
  { id: 64, title: "Оформить отчёт о проверке интерфейса", completed: false, priority: "low" },
];
