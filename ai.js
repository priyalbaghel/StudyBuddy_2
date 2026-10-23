const { GoogleGenAI } = require('@google/genai');
const { generateLocal } = require('./localFallback');

const MODEL = 'gemini-3.8-flash';
const MAX_DOCUMENT_CHARS = 60000;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

function cleanJson(text) {
  const match = String(text || '').match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
  return JSON.parse(String(match[1] || '').trim());
}

function generationError(type, message, status = 502, cause) {
  const error = new Error(`Could not generate ${type}: ${message}`);
  error.status = status;
  error.stage = `gemini:${type}`;
  error.cause = cause;
  return error;
}

function validateResult(type, result) {
  if ((type === 'summary' || type === 'notes') && typeof result === 'string' && result.trim()) return result.trim();
  if (type === 'quiz' && Array.isArray(result) && result.length >= 1 && result.every(q => q && typeof q.questionText === 'string' && q.questionText.trim() && Array.isArray(q.options) && q.options.length === 4 && q.options.every(option => typeof option === 'string' && option.trim()) && Number.isInteger(q.correctOptionIndex) && q.correctOptionIndex >= 0 && q.correctOptionIndex < 4 && typeof q.explanation === 'string' && q.explanation.trim())) return result;
  if (type === 'flashcards' && Array.isArray(result) && result.length >= 1 && result.every(card => card && typeof card.frontQuestion === 'string' && card.frontQuestion.trim() && typeof card.backAnswer === 'string' && card.backAnswer.trim())) return result;
  if (type === 'viva' && Array.isArray(result) && result.length >= 1 && result.every(question => question && typeof question.question === 'string' && question.question.trim() && typeof question.answer === 'string' && question.answer.trim() && Array.isArray(question.followUpQuestions) && question.followUpQuestions.every(followUp => typeof followUp === 'string' && followUp.trim()))) return result;
  throw generationError(type, 'Gemini returned empty or invalid content.', 502);
}

function responseStatus(error) {
  const status = Number(error?.status || error?.statusCode || error?.code);
  if (Number.isInteger(status) && status > 0) return status;
  const match = String(error?.message || '').match(/\b(400|401|403|404|408|429|500|502|503|504)\b/);
  if (match) return Number(match[1]);
  if (/UNAVAILABLE|high demand|temporarily unavailable/i.test(String(error?.message || ''))) return 503;
  return 502;
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function timeoutError() { return Object.assign(new Error('Gemini request timed out.'), { status: 408 }); }
async function withTimeout(promise, timeoutMs) { let timer; const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(timeoutError()), timeoutMs); }); try { return await Promise.race([promise, timeout]); } finally { clearTimeout(timer); } }
function isRetryable(status) { return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504; }

async function requestContent(ai, type, prompt, documentText) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const request = ai.models.generateContent({ model: MODEL, contents: `${prompt}\n\nDocument:\n${documentText.slice(0, MAX_DOCUMENT_CHARS)}`, config: { responseMimeType: type === 'summary' || type === 'notes' ? 'text/plain' : 'application/json' } });
      return await withTimeout(request, REQUEST_TIMEOUT_MS);
    } catch (error) {
      const status = responseStatus(error);
      if (isRetryable(status) && attempt < MAX_RETRIES) {
        const delay = (350 * (2 ** attempt)) + Math.floor(Math.random() * 250);
        console.warn(`AI generation temporary failure at gemini:${type} (HTTP ${status}); retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
        await wait(delay);
        continue;
      }
      if (status === 429) throw generationError(type, 'Gemini rate limit reached after bounded retries.', 429, error);
      if (status === 404) throw generationError(type, 'The configured Gemini model or endpoint was not found.', 502, error);
      if (status === 401 || status === 403) throw generationError(type, 'Gemini credentials were rejected. Check the server configuration.', 502, error);
      if (isRetryable(status)) throw generationError(type, `Gemini remained unavailable after ${MAX_RETRIES + 1} attempts.`, status, error);
      throw error;
    }
  }
}

const prompts = {
  summary: 'Create concise, well-structured smart study notes with headings, bullets, key terms, and a short takeaway. Return plain text only.',
  notes: 'Create concise, well-structured smart study notes with headings, bullets, key terms, and a short takeaway. Return plain text only.',
  quiz: 'Create exactly 5 multiple-choice questions based only on facts and concepts in the document. Avoid generic questions and do not invent information. Each question must have exactly 4 distinct options and one clearly correct answer. Return JSON array only: [{questionText,options:[4 strings],correctOptionIndex,explanation}].',
  flashcards: 'Create exactly 8 useful terminology flashcards based only on the document. Return JSON array only: [{frontQuestion,backAnswer}].',
  viva: 'Create exactly 5 oral exam preparation items based only on the document. Each item must include a concise question, a correct concise answer, and an array of 1 or 2 useful follow-up questions. Return JSON array only: [{question,answer,followUpQuestions:[strings]}]. Do not invent facts.'
};

async function generate(type, text) {
  if (process.env.STUDYBUDDY_DISABLE_GEMINI === '1') throw generationError(type, 'Gemini disabled for local fallback testing.', 503);
  if (!process.env.GEMINI_API_KEY) throw generationError(type, 'GEMINI_API_KEY is not configured on the server.', 503);
  const documentText = typeof text === 'string' ? text.replace(/\u0000/g, '').trim() : '';
  if (!documentText) throw generationError(type, 'This PDF has no extractable text.', 422);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await requestContent(ai, type, prompts[type], documentText);
    const raw = await response?.text;
    return validateResult(type, type === 'summary' || type === 'notes' ? raw : cleanJson(raw));
  } catch (error) {
    if (error.stage) throw error;
    const status = responseStatus(error);
    console.error(`AI generation failed at gemini:${type} (HTTP ${status}): ${error.message}`);
    throw generationError(type, 'Gemini returned unusable content.', status, error);
  }
}

async function generateReliable(type, text) {
  const documentText = typeof text === 'string' ? text.replace(/\u0000/g, '').trim().slice(0, MAX_DOCUMENT_CHARS) : '';
  if (documentText.length < 80) throw generationError(type, 'This PDF has insufficient readable text for generation.', 422);
  try {
    return { result: await generate(type, documentText), source: 'gemini' };
  } catch (geminiError) {
    console.warn(`Using local fallback for ${type} after ${geminiError.stage || 'AI'} failure.`);
    try {
      return { result: generateLocal(type, documentText), source: 'local' };
    } catch (fallbackError) {
      geminiError.status = 422;
      geminiError.stage = `fallback:${type}`;
      geminiError.message = `Could not generate ${type}: Gemini failed and local fallback could not produce usable content (${fallbackError.message})`;
      throw geminiError;
    }
  }
}

module.exports = { generate, generateReliable, generateLocal, validateResult, responseStatus, requestContent };
