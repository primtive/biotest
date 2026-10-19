import { parse } from 'node-html-parser';
import prisma from "@/data/prisma";
import { loadEnvConfig } from '@next/env';
import { sanitizeContent } from '@/lib/html';
loadEnvConfig(process.cwd(), true);

// const topicList = [221, 222, 7, 48, 51, 162, 52, 533, 49, 54, 55, 6, 53, 2, 1, 93, 21, 22, 142, 98, 97, 272, 141, 143, 139, 239, 145, 12, 14, 158, 77, 78, 43, 15, 17, 166, 16, 18, 19, 199, 266, 149, 9, 8, 10, 610, 33, 377, 34, 35, 36, 188, 38, 26, 432, 50, 444, 404, 40, 360, 20, 204, 205, 202, 200, 23, 201, 456, 330, 24, 30, 300, 25, 154, 187]
const topicList = [166, 16, 18, 19, 199, 266, 149, 9, 8, 10, 610, 33, 377, 34, 35, 36, 188, 38, 26, 432, 50, 444, 404, 40, 360, 20, 204, 205, 202, 200, 23, 201, 456, 330, 24, 30, 300, 25, 154, 187]
const decoder = new TextDecoder('cp1251');


async function parseZubr() {
  const topicGroupId = process.env.TOPIC_GROUP_ID;
  if (!topicGroupId || !/^[a-f\d]{24}$/i.test(topicGroupId)) throw new Error('Set TOPIC_GROUP_ID to the destination curriculum ID before importing');
  if (!await prisma.topicGroup.findUnique({ where: { id: topicGroupId } })) throw new Error('Destination curriculum does not exist');
  for (const topicId of topicList) {
    console.log(`fetching ${topicId}...`);
    const res = await fetch(`https://bio-faq.ru/zubr/zubr${('00' + topicId).slice(-3)}.html`)
    if (!res.ok) throw new Error(`Source returned HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const data = decoder.decode(buffer);
    const root = parse(data);
    const topic = root.querySelector('h1')?.innerHTML
    if (!topic) {
      console.log('404');
      continue
    }
    if (await prisma.topic.findFirst({where: {name: topic, topicGroupId}})) {
      console.log('db object exists, skipping');
      continue
    }
    console.log("ok, continuing...");

    const topicObjectId = (await prisma.topic.create({
      data: {
        name: topic,
        topicGroupId,
      }
    })).id

    var tasks: Array<{ html: string, answer: string, topicId: string }> = [];

    const nodes = root.querySelector('.col2')!.childNodes.filter(x => x.nodeType == 1)
    for (const answer of root.querySelectorAll("#myID_1")) {
      const index = Array.prototype.indexOf.call(nodes, answer);
      const task = nodes[index - 1]
      const answerP = answer.querySelector('div > p');
      if (!answerP) continue
      tasks.push({
        html: sanitizeContent(task!.innerHTML),
        answer: answerP.innerText,
        topicId: topicObjectId
      })
    }
    await prisma.task.createMany({data: tasks})
    console.log("ok");
  }
  console.log('done');
}

parseZubr().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
