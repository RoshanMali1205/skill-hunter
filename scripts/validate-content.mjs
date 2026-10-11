import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Read the same file registry as the app so this check cannot silently omit a subject.
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const subjects = JSON.parse(read('public/content/subjects.json'));
const service = read('src/app/core/services/content.service.ts');
const paths = [
  ...new Set([...service.matchAll(/['"](content\/[^'"]+\.json)['"]/g)].map((m) => m[1])),
].filter((path) => path !== 'content/subjects.json');
assert(paths.length > 0, 'No registered content files found');
const topics = paths.flatMap((path) => JSON.parse(read('public/' + path)));
const topicIds = new Set();
const questionIds = new Set();
const globalQuestionCounts = new Map();
for (const topic of topics)
  for (const block of topic.blocks.filter((b) => 'question' in b)) {
    globalQuestionCounts.set(block.id, (globalQuestionCounts.get(block.id) ?? 0) + 1);
  }
const catalog = new Map();
for (const subject of subjects) {
  for (const category of subject.categories) {
    for (const topic of category.topics) {
      assert(!catalog.has(topic.id), `Duplicate catalog topic: ${topic.id}`);
      catalog.set(topic.id, {
        subjectId: subject.id,
        categoryId: category.id,
        difficulty: topic.difficulty,
      });
    }
  }
}
const counts = new Map(subjects.map((subject) => [subject.id, 0]));
const prompts = new Set();
const trickyIds = new Set();
for (const topic of topics) {
  assert(!topicIds.has(topic.id), `Duplicate topic: ${topic.id}`);
  topicIds.add(topic.id);
  assert.deepEqual(
    catalog.get(topic.id),
    {
      subjectId: topic.subjectId,
      categoryId: topic.categoryId,
      difficulty: topic.difficulty,
    },
    `Topic/catalog mismatch: ${topic.id}`,
  );
  const orders = new Set();
  for (const block of topic.blocks) {
    assert(
      Number.isFinite(block.order) && !orders.has(block.order),
      `Invalid or duplicate block order: ${topic.id}/${block.id}`,
    );
    orders.add(block.order);
    if (!('question' in block)) continue;
    // Three existing IDs collide across JavaScript and TypeScript. Preserve
    // saved learner references; require all newly authored IDs to be global.
    const scopedId = topic.subjectId + ':' + block.id;
    assert(!questionIds.has(scopedId), `Duplicate question ID within subject: ${scopedId}`);
    questionIds.add(scopedId);
    if (block.type !== 'tricky-question') continue;
    assert(!trickyIds.has(block.id), `Duplicate ID in tricky bank: ${block.id}`);
    trickyIds.add(block.id);
    for (const field of ['question', 'answer', 'explanation']) {
      assert(
        typeof block[field] === 'string' && block[field].trim(),
        `Missing ${field}: ${block.id}`,
      );
    }
    const key = topic.subjectId + ':' + block.question.trim().toLowerCase();
    assert(!prompts.has(key), `Duplicate tricky prompt: ${block.id}`);
    prompts.add(key);
    if (block.id.includes('-tricky-')) {
      assert.equal(
        globalQuestionCounts.get(block.id),
        1,
        `New question ID is not globally unique: ${block.id}`,
      );
      assert(block.title?.trim(), `Missing question title: ${block.id}`);
      assert(
        block.hints?.some((h) => h.trim()),
        `Missing hint: ${block.id}`,
      );
      assert(
        /\[Further reading\]\(https:\/\/[^\s)]+\)/.test(block.explanation),
        `Missing reference: ${block.id}`,
      );
    }
    counts.set(topic.subjectId, counts.get(topic.subjectId) + 1);
  }
}
assert.equal(topicIds.size, catalog.size, 'Catalog contains a topic with no content');
for (const [subjectId, count] of counts) {
  assert(count >= 20, `Insufficient tricky coverage: ${subjectId} has ${count}`);
  console.log(`${subjectId}: ${count} tricky questions`);
}
console.log(
  `Validated ${topicIds.size} topics, ${questionIds.size} subject-scoped questions, and ${prompts.size} distinct tricky questions in ${fileURLToPath(root)}`,
);
