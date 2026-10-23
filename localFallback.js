const STOP_WORDS = new Set('a an and are as at be been being by can could for from has have in into is it its may of on or that the their this to was were with when which who will would'.split(' '));
const GENERIC_WORDS = new Set('according document statement concept important thing idea process following following describe explanation question answer'.split(' '));

function cleanText(text) {
  return String(text || '').replace(/\u0000/g, '').replace(/\r/g, '').split('\n').map(line => line.trim()).filter(line => line && !/^page\s*\d+$/i.test(line) && !/^\d+$/.test(line)).join(' ').replace(/\s+/g, ' ').trim();
}

function sentences(text) {
  return cleanText(text).split(/(?<=[.!?])\s+/).map(sentence => sentence.trim()).filter(sentence => sentence.length >= 35 && /[a-z]{3}/i.test(sentence));
}

function words(value) { return (String(value || '').toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || []).filter(word => !STOP_WORDS.has(word)); }
function normalizeQuestion(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function meaningfulKeywords(value) { return words(value).filter(word => !GENERIC_WORDS.has(word)); }
function unique(items) { return [...new Set(items.filter(Boolean))]; }
function shortAnswer(value, max = 180) { const answer = String(value || '').trim(); return answer.length <= max ? answer : `${answer.slice(0, max).replace(/\s+\S*$/, '')}…`; }

function conceptFromDefinition(sentence) {
  const match = sentence.match(/^(.{2,90}?)\s+(?:is|are|means|refers to|is defined as|can be defined as|stands for)\s+(.{20,})$/i);
  if (!match) return null;
  const concept = match[1].replace(/^(the|a|an)\s+/i, '').trim();
  return concept.length <= 90 ? { concept, definition: match[2].trim(), source: sentence } : null;
}

function extractKnowledge(text) {
  const all = sentences(text);
  const defs = all.map(conceptFromDefinition).filter(Boolean);
  const definitionSentences = new Set(defs.map(item => item.source));
  const scored = all.map((sentence, index) => {
    const terms = meaningfulKeywords(sentence);
    const signals = terms.filter(term => /define|means|refers|important|therefore|because|includes|consists|known|called|used|allows|prevents|ensures|leads|causes|result/.test(term)).length;
    return { sentence, index, score: signals * 4 + Math.min(terms.length, 28) / 10 - index / Math.max(all.length, 1) };
  });
  const important = scored.sort((a, b) => b.score - a.score).map(item => item.sentence);
  const reasoning = all.filter(sentence => !definitionSentences.has(sentence)).filter(sentence => /\b(why|how|because|therefore|however|unlike|whereas|difference|compare|advantage|disadvantage|problem|effect|ensure|when|if|example|result|leads|causes|used|application)\b/i.test(sentence));
  const process = all.filter(sentence => /\b(step|process|procedure|first|then|next|finally|before|after|sequence|consists)\b/i.test(sentence));
  const relations = all.filter(sentence => /\b(unlike|whereas|both|difference|similar|compared|relationship|depends|connected|related)\b/i.test(sentence));
  const causesEffects = all.filter(sentence => /\b(because|therefore|causes|caused|leads to|results in|so that|prevents|allows|ensures)\b/i.test(sentence));
  const applications = all.filter(sentence => /\b(used|use|application|example|when|if|practical|system|allows|prevents)\b/i.test(sentence));
  return { all, defs, facts: important, reasoning: unique(reasoning), process: unique(process), relations: unique(relations), causesEffects: unique(causesEffects), applications: unique(applications) };
}

function importantSentences(text, limit = 6) { return extractKnowledge(text).facts.slice(0, limit); }
function definitions(text) { return extractKnowledge(text).defs.slice(0, 12); }

function similarity(left, right) {
  const a = new Set(meaningfulKeywords(left));
  const b = new Set(meaningfulKeywords(right));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter(term => b.has(term)).length;
  return intersection / new Set([...a, ...b]).size;
}

function distinctCandidates(candidates, limit) {
  const selected = [];
  for (const candidate of candidates) {
    const prompt = candidate.questionText || candidate.frontQuestion || candidate.question;
    if (!prompt || selected.some(existing => normalizeQuestion(existing.questionText || existing.frontQuestion || existing.question) === normalizeQuestion(prompt) || similarity(existing.questionText || existing.frontQuestion || existing.question, prompt) >= 0.72)) continue;
    selected.push(candidate);
    if (selected.length >= limit) break;
  }
  return selected;
}

function summary(text) {
  const knowledge = extractKnowledge(text);
  const points = knowledge.facts.slice(0, 6);
  if (!points.length) throw new Error('The document does not contain enough readable text for a local summary.');
  return `Key points\n\n${points.map(point => `• ${point}`).join('\n')}\n\nTakeaway\n\n${points[0]}`;
}

function smartNotes(text) {
  const knowledge = extractKnowledge(text);
  const sections = ['Smart notes'];
  if (knowledge.defs.length) sections.push(`\nKey concepts\n${knowledge.defs.slice(0, 6).map(item => `• ${item.concept}: ${shortAnswer(item.definition)}`).join('\n')}`);
  if (knowledge.process.length) sections.push(`\nProcesses and steps\n${knowledge.process.slice(0, 4).map(point => `• ${point}`).join('\n')}`);
  if (knowledge.causesEffects.length) sections.push(`\nCauses and effects\n${knowledge.causesEffects.slice(0, 4).map(point => `• ${point}`).join('\n')}`);
  if (knowledge.facts.length && sections.length === 1) sections.push(`\nImportant points\n${knowledge.facts.slice(0, 8).map(point => `• ${point}`).join('\n')}`);
  if (sections.length === 1) throw new Error('The document does not contain enough readable text for local notes.');
  return sections.join('\n');
}

function definitionDistractors(defs, current) {
  return defs.filter(item => item.concept !== current.concept).map(item => shortAnswer(item.definition, 150));
}

function quiz(text) {
  const knowledge = extractKnowledge(text);
  const candidates = [];
  knowledge.defs.slice(0, 8).forEach((item, index) => {
    const distractors = definitionDistractors(knowledge.defs, item);
    if (distractors.length < 3) return;
    candidates.push({
      questionText: index % 2 ? `Which statement best describes ${item.concept}?` : `What role does ${item.concept} have in the document?`,
      options: [shortAnswer(item.definition), ...distractors.slice(0, 3)],
      correctOptionIndex: 0,
      explanation: `The document states that ${item.concept} ${item.definition}`,
      concept: item.concept
    });
  });
  const factualDistractors = knowledge.facts.filter(point => !knowledge.defs.some(item => item.source === point)).slice(0, 4);
  knowledge.relations.slice(0, 2).forEach((point, index) => {
    if (factualDistractors.length < 3) return;
    candidates.push({ questionText: index ? 'Which comparison is supported by the document?' : 'Which relationship between concepts is described?', options: [shortAnswer(point), ...factualDistractors.slice(0, 3).map(shortAnswer)], correctOptionIndex: 0, explanation: 'This comparison is stated in the source text.' });
  });
  knowledge.causesEffects.slice(0, 2).forEach((point, index) => {
    if (factualDistractors.length < 3) return;
    candidates.push({ questionText: index ? 'What consequence follows from the stated condition?' : 'Which cause-and-effect relationship is described?', options: [shortAnswer(point), ...factualDistractors.slice(0, 3).map(shortAnswer)], correctOptionIndex: 0, explanation: 'The cause and effect are supported by the source text.' });
  });
  const items = distinctCandidates(candidates, 5).map(({ concept, ...item }) => item);
  if (!items.length) throw new Error('The document does not contain enough distinct facts and distractors for a reliable local quiz.');
  return items;
}

function flashcards(text) {
  const knowledge = extractKnowledge(text);
  const candidates = [];
  knowledge.defs.forEach(item => candidates.push({ frontQuestion: `Define ${item.concept} in one sentence.`, backAnswer: shortAnswer(item.definition), concept: item.concept }));
  knowledge.all.forEach(sentence => {
    const abbreviation = sentence.match(/\b([A-Za-z][A-Za-z ]{2,40})\s*\(([A-Z]{2,8})\)/);
    if (abbreviation) candidates.push({ frontQuestion: `What does ${abbreviation[2]} stand for?`, backAnswer: shortAnswer(abbreviation[1]), concept: abbreviation[2] });
  });
  knowledge.applications.slice(0, 4).forEach(point => candidates.push({ frontQuestion: `What purpose or use is described here?`, backAnswer: shortAnswer(point), concept: meaningfulKeywords(point).slice(0, 3).join(' ') }));
  knowledge.facts.slice(0, 8).forEach(point => candidates.push({ frontQuestion: `Recall the important property about ${meaningfulKeywords(point).slice(0, 4).join(' ')}.`, backAnswer: shortAnswer(point), concept: meaningfulKeywords(point).slice(0, 4).join(' ') }));
  const items = distinctCandidates(candidates, 8).map(({ concept, ...item }) => item);
  if (!items.length) throw new Error('The document does not contain enough distinct terminology or facts for local flashcards.');
  return items;
}

function viva(text) {
  const knowledge = extractKnowledge(text);
  const candidates = [];
  knowledge.relations.forEach((point, index) => candidates.push({ question: index % 2 ? 'How are the related concepts in this passage similar or different?' : 'Explain the relationship between the concepts in this passage.', answer: point, followUpQuestions: ['What practical consequence follows from this relationship?'] }));
  knowledge.causesEffects.forEach(point => candidates.push({ question: 'Why does this cause produce the stated effect?', answer: point, followUpQuestions: ['What could happen if the stated condition changed?'] }));
  knowledge.process.forEach(point => candidates.push({ question: 'How does the process or sequence described here work?', answer: point, followUpQuestions: ['Which step would you explain first and why?'] }));
  knowledge.applications.forEach(point => candidates.push({ question: 'How would this concept be applied in the situation described?', answer: point, followUpQuestions: ['What limitation should be considered in that application?'] }));
  if (candidates.length < 3) knowledge.defs.forEach(item => candidates.push({ question: `Why is ${item.concept} needed, and how would you explain it to a classmate?`, answer: item.definition, followUpQuestions: [`How is ${item.concept} connected to another concept in the document?`] }));
  const items = distinctCandidates(candidates, 5);
  if (!items.length) throw new Error('The document does not contain enough distinct concepts for local Viva preparation.');
  return items;
}

function generateLocal(type, text) {
  const cleaned = cleanText(text);
  if (cleaned.length < 80) throw new Error('This PDF has insufficient readable text for local generation. Please upload a text-based PDF.');
  if (type === 'summary') return summary(cleaned);
  if (type === 'notes') return smartNotes(cleaned);
  if (type === 'quiz') return quiz(cleaned);
  if (type === 'flashcards') return flashcards(cleaned);
  if (type === 'viva') return viva(cleaned);
  throw new Error(`Unsupported local generation type: ${type}`);
}

module.exports = { generateLocal, cleanText, definitions, importantSentences, extractKnowledge, normalizeQuestion, similarity, distinctCandidates };
