"use strict";

const plannedText = "8";
const completedText = "3";
const additionalText = "2";

// Преобразуем строки явно: + должен складывать числа, а не объединять текст.
const completedTotal = Number(completedText) + Number(additionalText);
const remainingTasks = Number(plannedText) - completedTotal;

console.log("Выполнено:", completedTotal);
console.log("Осталось:", remainingTasks);

let controlSum = 0;

// Условие <= включает в сумму последний номер задачи — 4.
for (let taskNumber = 1; taskNumber <= 4; taskNumber += 1) {
  controlSum += taskNumber;
}

console.log("Контрольная сумма:", controlSum);
