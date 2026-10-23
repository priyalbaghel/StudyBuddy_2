const assert = require('node:assert/strict');
const test = require('node:test');
const { validateResult, responseStatus, requestContent, generateReliable, generateLocal } = require('../services/ai');

const validViva = [{ question: 'What is 1NF?', answer: 'Every attribute has atomic values.', followUpQuestions: ['Why are repeating groups problematic?'] }];

test('validates Viva question, answer, and follow-up fields', () => {
  assert.deepEqual(validateResult('viva', validViva), validViva);
  assert.throws(() => validateResult('viva', [{ question: 'What is 1NF?', followUpQuestions: [] }]), /empty or invalid/);
  assert.throws(() => validateResult('viva', []), /empty or invalid/);
});

test('classifies temporary, rate-limit, and missing-model errors', () => {
  assert.equal(responseStatus({ status: 503 }), 503);
  assert.equal(responseStatus({ message: '429 RESOURCE_EXHAUSTED' }), 429);
  assert.equal(responseStatus({ message: '404 model not found' }), 404);
});

test('retries Viva 503 responses at most twice after the initial attempt', async () => {
  let calls = 0;
  const fakeAi = { models: { generateContent: async () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error('UNAVAILABLE'), { status: 503 });
    return { text: JSON.stringify(validViva) };
  } } };
  const response = await requestContent(fakeAi, 'viva', 'prompt', 'document text');
  assert.equal(calls, 3);
  assert.equal(JSON.parse(response.text)[0].question, 'What is 1NF?');
});

test('local fallback generates grounded content for a new document without Gemini', async () => {
  const text = 'Normalization is the process of organizing data to reduce redundancy. A functional dependency means one attribute determines another attribute. Atomicity is the property that makes a transaction all-or-nothing. Durability is the property that preserves committed changes. Isolation is the property that separates concurrent transactions. Consistency is the property that preserves database rules. Transactions use atomicity to ensure all operations succeed or fail together.';
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    for (const type of ['summary', 'quiz', 'flashcards', 'viva']) {
      const generated = await generateReliable(type, text);
      assert.equal(generated.source, 'local');
      assert.ok(generated.result);
    }
    assert.match(generateLocal('notes', text), /Key concepts|Important points/);
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test('local Quiz, Flashcards, and Viva use distinct structures and prompts', () => {
  const text = 'Normalization is the process of organizing data to reduce redundancy. A functional dependency means one attribute determines another attribute. Atomicity is the property that makes a transaction all-or-nothing. Durability is the property that preserves committed changes. Isolation is the property that separates concurrent transactions. Consistency is the property that preserves database rules. Concurrent transactions can cause lost updates when isolation is too weak. Normalization and denormalization have different performance trade-offs.';
  const quiz = generateLocal('quiz', text);
  const cards = generateLocal('flashcards', text);
  const viva = generateLocal('viva', text);
  assert.ok(quiz.every(item => item.options.length === 4 && Number.isInteger(item.correctOptionIndex)));
  assert.ok(cards.every(item => item.frontQuestion && item.backAnswer));
  assert.ok(viva.every(item => item.question && item.answer && Array.isArray(item.followUpQuestions)));
  const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const quizPrompts = new Set(quiz.map(item => normalize(item.questionText)));
  const cardPrompts = new Set(cards.map(item => normalize(item.frontQuestion)));
  const vivaPrompts = new Set(viva.map(item => normalize(item.question)));
  assert.equal([...quizPrompts].some(prompt => cardPrompts.has(prompt) || vivaPrompts.has(prompt)), false);
  assert.equal([...cardPrompts].some(prompt => vivaPrompts.has(prompt)), false);
});
