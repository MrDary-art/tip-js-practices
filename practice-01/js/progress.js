"use strict";

// Вариант 6: номер в журнале 22, ((22 - 1) % 8) + 1 = 6.
const totalTasks = 18;
const completedTasks = 6;

if (typeof totalTasks !== "number" || typeof completedTasks !== "number") {
  console.log("Ошибка: количество задач должно быть задано числами.");
} else if (!Number.isFinite(totalTasks) || !Number.isFinite(completedTasks)) {
  console.log("Ошибка: количество задач должно быть конечным числом.");
} else if (!Number.isInteger(totalTasks) || !Number.isInteger(completedTasks)) {
  console.log("Ошибка: количество задач должно быть целым.");
} else if (totalTasks < 0 || completedTasks < 0) {
  console.log("Ошибка: количество задач не может быть отрицательным.");
} else if (totalTasks > 1000) {
  console.log("Ошибка: общее количество задач не должно превышать 1000.");
} else if (completedTasks > totalTasks) {
  console.log("Ошибка: выполненных задач больше, чем всего задач.");
} else if (totalTasks === 0) {
  // До этой ветки доходят только допустимые данные: здесь оба числа равны 0.
  console.log("Задач пока нет");
} else {
  const remainingTasks = totalTasks - completedTasks;
  const percentage = completedTasks / totalTasks * 100;
  let status;

  if (completedTasks === 0) {
    status = "Не начато";
  } else if (completedTasks === totalTasks) {
    status = "Завершено";
  } else {
    status = "В работе";
  }

  console.log(`Всего задач: ${totalTasks}`);
  console.log(`Выполнено: ${completedTasks}`);
  console.log(`Осталось: ${remainingTasks}`);
  console.log(`Прогресс: ${percentage.toFixed(1)}%`);
  console.log(`Статус: ${status}`);
}
