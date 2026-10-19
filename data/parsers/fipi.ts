import { parse } from 'node-html-parser';
import clipboardy from 'clipboardy';
import prisma from "../prisma";
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const decoder = new TextDecoder('utf-8');

async function parseTasks() {
  if (process.env.ALLOW_LEGACY_IMPORT !== "1") throw new Error("Legacy importer is disabled. Use a staged import and explicit backup.");
  const topicList = fs.readFileSync(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), 'fipi.txt'), 'utf-8');
  // Existing tasks are retained so old test references remain valid.
  // await prisma.topic.deleteMany()

  const tasks = []
  await Promise.all(topicList.split('\n').filter(Boolean).map(async str => {
    const [topicName, url] = str.split(';')

    console.log(`creating topic ${topicName}`);
    // const topic = await prisma.topic.create({
    // data: {
    // name: topicName,
    // topicGroupId: '67962ae5e4f21c30e05aef91'
    // }
    // })
    const topic = await prisma.topic.findFirst({
      where: {
        name: topicName
      }
    })

    console.log(`fetching ${topicName}`);
    const res = await fetch(url)
    const buffer = await res.arrayBuffer();
    const data = decoder.decode(buffer);
    const root = parse(data);
    const div = root.querySelector('div[itemprop="articleBody"]')!
    const nodes = div.childNodes!.filter(x => x.nodeType == 1)
    for (const separator of [...div.querySelectorAll('p[align="right"]'), ...div.querySelectorAll('p[style="text-align: right;"]')]) {
      const index = Array.prototype.indexOf.call(nodes, separator);
      const answer = nodes[index - 1].childNodes[0].querySelector('p').childNodes!.filter(x => x.nodeType == 3).map(x => x.rawText.trim().replace(' или', ', ')).join(', ')
      const htmlArray = [];
      var indexDif = 2
      while (true) {
        const el = nodes[index - indexDif]
        if (el.rawTagName == 'h3' || el.getAttribute('align')) break
        htmlArray.push(el.innerHTML.replace('src="/', 'src="https://gdzotvet.ru/'))
        indexDif++;
      }
      console.log(`creating task with index ${index}`)
      await prisma.task.create({
        data: {
          answer,
          html: htmlArray.reverse().join('\n'),
          topicId: topic.id
        }
      })
    }
  }))
  console.log('done');
}

parseTasks()
