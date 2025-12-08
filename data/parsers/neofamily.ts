import prisma from "../prisma";
import fetch from "node-fetch";
import fs from "fs";

async function fetchTasks() {
  const tasks: any[] = [];

  for (let page = 1; page <= 21; page++) {
    console.log(`Fetching page ${page}...`);
    const res = await fetch(
      `https://backend.neofamily.ru/api/task?sort[id]=asc&only=score,question,additional_info,subject_id,is_hidden,is_informal,free_answer,is_related,id,task_answer_size,status,is_favorite,is_briefcase,criteria&page=${page}&subject=biologiya&perPage=500&except_solved=0&is_informal=0&is_hidden=0`
    );
    const data = await res.json();
    tasks.push(...data.data); // зависит от структуры API
  }

  fs.writeFile("neofamily.json", JSON.stringify(tasks), function (err) {
    if (err) {
      console.log(err);
    }
  });
  process.exit(0);

  for (const t of tasks) {
    // 1️⃣ обработаем тему
    const theme = t.themes?.[0];
    if (!theme) continue;

    // создаем тему, если ее еще нет
    const topic = await prisma.topic.upsert({
      where: { name: theme.name },
      update: {},
      create: {
        name: theme.name,
        topicGroup: { connect: { id: "67962669e4f21c30e05aef8b" } },
      },
    });

    // 2️⃣ добавляем задание
    await prisma.task.create({
      data: {
        html: t.question,
        answer: "",
        line: t.task_line?.name ?? "",
        source: "Neofamily",
        explanation: "",
        topicId: topic.id,
      },
    });
  }

  console.log(`✅ Imported ${tasks.length} tasks.`);
}