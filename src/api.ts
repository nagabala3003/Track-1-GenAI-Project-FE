import axios from "axios";
import type { ActionResult, ModePreference, ToneOption } from "./types";

interface ApiEnvelope {
  status?: string;
  data?: unknown;
  error?: unknown;
  detail?: unknown;
  message?: unknown;
}

interface SmartWorkflowRequest {
  context: string;
  question?: string;
  modePreference: ModePreference;
  tone: ToneOption;
}

const OPENING_PHRASES = [
  "Based on the provided context,",
  "From the given information,",
  "Analyzing the input,",
  "Considering the details,",
  "Looking at the context,",
] as const;

const SUMMARY_TITLES = ["Summary", "Quick Summary", "Overview"] as const;
const ANSWER_TITLES = ["Answer", "Direct Answer", "Response"] as const;
const KEY_POINT_TITLES = ["Key Points", "Highlights", "Main Takeaways"] as const;
const SHORT_INPUT_THRESHOLD = 20;
const MEDIUM_INPUT_THRESHOLD = 220;
const KEY_POINT_WORD_LIMIT = 14;
const SHORT_TOPIC_INSIGHTS: Record<
  string,
  { summaryFormal: string; summaryCasual: string; bullets: [string, string, string] }
> = {
  ai: {
    summaryFormal:
      "Artificial Intelligence enables software systems to analyze patterns, automate tasks, and support decisions.",
    summaryCasual:
      "AI helps software learn patterns, automate repetitive work, and assist better decisions.",
    bullets: [
      "AI models learn from data to detect patterns and make predictions.",
      "Common use cases include automation, assistants, search, and recommendations.",
      "Strong outcomes require quality data, clear goals, and human oversight.",
    ],
  },
  ml: {
    summaryFormal:
      "Machine Learning builds models that improve predictions using historical data and feedback loops.",
    summaryCasual:
      "ML trains models on past data so predictions get better over time.",
    bullets: [
      "ML uses training data to learn relationships and make predictions.",
      "Model performance depends on data quality and feature design.",
      "Monitoring and retraining are needed to prevent performance drift.",
    ],
  },
  llm: {
    summaryFormal:
      "Large Language Models generate and transform text by learning statistical language patterns.",
    summaryCasual:
      "LLMs understand and generate text by learning from large text datasets.",
    bullets: [
      "LLMs are strong at drafting, summarizing, and answering text-based questions.",
      "Prompt clarity significantly impacts response quality.",
      "Validation is needed for factual accuracy and safety-sensitive tasks.",
    ],
  },
  python: {
    summaryFormal:
      "Python is best learned through fundamentals first, then consistent practice and small projects.",
    summaryCasual:
      "The easiest way to learn Python is basics first, then daily practice and mini projects.",
    bullets: [
      "Start with basics: variables, loops, functions, and data structures.",
      "Practice daily with short exercises to build confidence.",
      "Build small projects to apply concepts and retain learning.",
    ],
  },
};

const QUESTION_PREFIXES = [
  "how",
  "what",
  "why",
  "when",
  "where",
  "who",
  "which",
  "can",
  "should",
  "is",
  "are",
  "do",
  "does",
] as const;

const REQUEST_PREFIXES = [
  "give",
  "suggest",
  "recommend",
  "plan",
  "help",
  "list",
  "share",
  "provide",
  "tell",
  "explain",
  "show",
] as const;

const STOP_WORDS = new Set([
  "about", "above", "after", "again", "against", "also", "among", "and", "are", "because",
  "been", "before", "being", "below", "between", "both", "but", "cannot", "could", "details",
  "during", "each", "from", "given", "have", "here", "into", "just", "more", "most", "much",
  "only", "other", "over", "project", "same", "some", "such", "that", "their", "there", "these",
  "this", "those", "through", "track", "under", "very", "what", "when", "where", "which", "while",
  "with", "would", "your", "about", "should", "before", "after", "stable",
]);

const http = axios.create({
  timeout: 30000,
});

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function extractResponseText(payload: unknown): string {
  const envelope = (payload ?? {}) as ApiEnvelope;
  const successText = toText(envelope.data);
  if (envelope.status === "success" && successText) return successText;
  if (successText) return successText;

  const fromError =
    toText(envelope.error) || toText(envelope.detail) || toText(envelope.message);
  if (fromError) throw new Error(fromError);

  throw new Error("The server returned an empty response.");
}

async function postJson(path: string, body: Record<string, string>): Promise<string> {
  const response = await http.post(path, body);
  return extractResponseText(response.data);
}

function toneInstruction(tone: ToneOption): string {
  return tone === "formal"
    ? "Use a formal, professional tone."
    : "Use a clear, friendly conversational tone.";
}

function buildSummaryPrompt(context: string, tone: ToneOption): string {
  return [
    "Create a concise summary of the provided context.",
    "Use natural wording and avoid repeating the same idea.",
    "Include a summary paragraph and short bullets.",
    toneInstruction(tone),
    "",
    `Context:\n${context}`,
  ].join("\n");
}

function buildQAPrompt(context: string, question: string, tone: ToneOption): string {
  return [
    "Answer the question using the provided context.",
    "Keep it concise and include distinct supporting bullets.",
    toneInstruction(tone),
    "",
    `Context:\n${context}`,
    "",
    `Question:\n${question}`,
  ].join("\n");
}

function buildKeyPointsPrompt(context: string, question: string | undefined, tone: ToneOption): string {
  const lines = [
    "Extract only key points from the context.",
    "Return 3 to 5 bullet points only.",
    `Each bullet must be <= ${KEY_POINT_WORD_LIMIT} words.`,
    "No intro paragraph, no conclusion, no headings.",
    "Avoid repeating the same idea.",
    toneInstruction(tone),
    "",
    `Context:\n${context}`,
  ];

  if (question?.trim()) {
    lines.push("", `Emphasize points relevant to:\n${question.trim()}`);
  }

  return lines.join("\n");
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9-]{1,}/g) ?? []).filter(
    (word) => !STOP_WORDS.has(word),
  );
}

function extractKeywords(text: string): string[] {
  const counts = new Map<string, number>();
  for (const word of toWords(text)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([word]) => word)
    .slice(0, 8);
}

function rankSentencesByKeywords(sentences: string[], keywords: string[]): string[] {
  if (keywords.length === 0) return sentences;
  return [...sentences].sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aScore = keywords.reduce((score, key) => score + (aLower.includes(key) ? 1 : 0), 0);
    const bScore = keywords.reduce((score, key) => score + (bLower.includes(key) ? 1 : 0), 0);
    return bScore - aScore;
  });
}

function trimToWords(text: string, maxWords: number): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function canonicalShortTopic(context: string): string {
  const compact = context
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (compact === "artificial intelligence" || compact === "gen ai" || compact === "genai") {
    return "ai";
  }
  if (compact === "python") return "python";
  if (compact === "machine learning") return "ml";
  if (compact === "large language model" || compact === "large language models") return "llm";
  return compact;
}

function sentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function inferTopicFromText(text: string): string {
  const compact = text.toLowerCase();
  if (compact.includes("python")) return "python";
  if (compact.includes("artificial intelligence") || compact.includes("gen ai") || compact.includes(" ai ")) {
    return "ai";
  }
  if (compact.includes("machine learning") || compact.includes(" ml ")) return "ml";
  if (compact.includes("llm") || compact.includes("large language model")) return "llm";
  return "";
}

function isQuestionLikeText(text: string): boolean {
  const compact = text.trim().toLowerCase();
  if (!compact) return false;
  if (compact.endsWith("?")) return true;
  return QUESTION_PREFIXES.some((prefix) => compact.startsWith(`${prefix} `));
}

function isRequestLikeText(text: string): boolean {
  const compact = text.trim().toLowerCase();
  if (!compact) return false;
  if (REQUEST_PREFIXES.some((prefix) => compact.startsWith(`${prefix} `))) return true;
  if (compact.startsWith("best ") || compact.startsWith("top ")) return true;
  if (compact.includes(" please")) return true;
  return false;
}

function isAnswerIntentText(text: string): boolean {
  return isQuestionLikeText(text) || isRequestLikeText(text);
}

function normalizeSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const withoutPunctuation = trimmed.replace(/[.!?]+$/, "");
  return `${sentenceCase(withoutPunctuation)}.`;
}

function extractQuestionPrompt(context: string, question?: string): string | undefined {
  const cleanQuestion = question?.trim();
  if (cleanQuestion) return cleanQuestion;
  if (isAnswerIntentText(context)) return context.trim();
  return undefined;
}

function buildQuestionStyleSummary(questionText: string, tone: ToneOption): string {
  const compactQuestion = questionText.replace(/\s+/g, " ").trim();
  const topicKey = inferTopicFromText(compactQuestion);
  const topicInsight = SHORT_TOPIC_INSIGHTS[topicKey];
  if (topicInsight) {
    return tone === "casual" ? topicInsight.summaryCasual : topicInsight.summaryFormal;
  }

  if (compactQuestion.toLowerCase().startsWith("how ")) {
    return tone === "casual"
      ? "Use a simple plan: learn the basics, practice daily, and apply with small projects."
      : "A practical approach is to learn fundamentals first, practice consistently, and apply knowledge through small projects.";
  }

  return tone === "casual"
    ? `Quick answer: focus on the core idea, then support it with clear examples.`
    : "Provide a direct answer first, then support it with concise, practical points.";
}

function buildQuestionStyleBullets(questionText: string, limit: number): string[] {
  const compactQuestion = questionText.replace(/\s+/g, " ").trim();
  const topicKey = inferTopicFromText(compactQuestion);
  const topicInsight = SHORT_TOPIC_INSIGHTS[topicKey];
  const fallback = [
    "Give a direct answer in one clear sentence.",
    "Add two practical steps the user can apply immediately.",
    "Include one example to make the answer actionable.",
  ];

  const items = topicInsight ? [...topicInsight.bullets] : fallback;
  return items.slice(0, limit).map(normalizeSentence).filter(Boolean);
}

function cleanLineValue(text: string): string {
  return text
    .replace(/^[-*\u2022]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^#+\s*/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function getInputScale(context: string): "short" | "medium" | "long" {
  const length = context.trim().length;
  if (length < SHORT_INPUT_THRESHOLD) return "short";
  if (length < MEDIUM_INPUT_THRESHOLD) return "medium";
  return "long";
}

function normalizeIdea(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceToBullet(sentence: string): string {
  return normalizeSentence(trimToWords(cleanLineValue(sentence), 16));
}

function buildShortSummarySentence(context: string, tone: ToneOption): string {
  const compact = context.replace(/\s+/g, " ").trim();
  const topicKey = canonicalShortTopic(compact);
  const topicInsight = SHORT_TOPIC_INSIGHTS[topicKey];
  if (topicInsight) {
    return tone === "casual" ? topicInsight.summaryCasual : topicInsight.summaryFormal;
  }

  const words = compact.split(" ").filter(Boolean);

  if (words.length === 0) return "Short input received.";
  if (words.length === 1) {
    const topic = sentenceCase(words[0].toLowerCase());
    return tone === "casual"
      ? `${topic} is the focus. Add one sentence for a more detailed response.`
      : `${topic} is the primary topic. Provide one additional sentence for a detailed response.`;
  }
  if (words.length <= 4) {
    return tone === "casual"
      ? `Quick take: ${words.join(" ")}. Add a little context for stronger output.`
      : `Brief context detected: ${words.join(" ")}. Add more detail for stronger output.`;
  }
  return `Short context detected: ${trimToWords(compact, 8)}.`;
}

function buildShortAnswerSentence(context: string, question: string): string {
  const base = context.replace(/\s+/g, " ").trim();
  const questionPreview = trimToWords(question, 8);
  return `For "${questionPreview}", the input suggests: ${trimToWords(base, 8)}.`;
}

function buildShortBullets(context: string, question?: string): string[] {
  const contextPreview = trimToWords(context.replace(/\s+/g, " ").trim(), 8);
  const topicKey = inferTopicFromText(contextPreview) || canonicalShortTopic(contextPreview);
  const topicInsight = SHORT_TOPIC_INSIGHTS[topicKey];
  const keywords = extractKeywords(`${context} ${question ?? ""}`);
  const points: string[] = [];

  if (topicInsight) {
    points.push(...topicInsight.bullets);
    if (question?.trim()) {
      points.push(`Question focus: ${trimToWords(question, 10)}.`);
    }
  } else {
    if (contextPreview) {
      points.push(`Main topic: ${contextPreview}.`);
    }

    if (keywords[0]) points.push(`Core idea: ${keywords[0]}.`);
    if (keywords[1]) points.push(`Related focus: ${keywords[1]}.`);

    if (!question) {
      points.push("State one concrete goal for more focused key points.");
      points.push("Add one more sentence to improve precision.");
    } else {
      points.push(`Question focus: ${trimToWords(question, 10)}.`);
      points.push("Add one supporting detail to improve precision.");
    }
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const line of points) {
    const clean = line.replace(/\s+/g, " ").trim();
    const key = normalizeIdea(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    unique.push(clean.endsWith(".") ? clean : `${clean}.`);
    if (unique.length >= 3) break;
  }

  if (unique.length < 3) {
    unique.push("Provide slightly more context for stronger key points.");
  }

  return unique;
}

function buildUniqueBullets(context: string, question?: string, limit = 5): string[] {
  const questionPrompt = extractQuestionPrompt(context, question);
  if (questionPrompt && splitSentences(context).length <= 1) {
    return buildQuestionStyleBullets(questionPrompt, limit);
  }

  if (getInputScale(context) === "short") {
    return buildShortBullets(context, question);
  }

  const sentences = splitSentences(context);
  const keywords = extractKeywords(`${context} ${question ?? ""}`);
  const ranked = rankSentencesByKeywords(sentences, keywords);

  const candidates: string[] = ranked.slice(0, 8).map((sentence) => sentenceToBullet(sentence));
  if (questionPrompt) {
    candidates.push(...buildQuestionStyleBullets(questionPrompt, 3));
  }
  candidates.push(...keywords.slice(0, 4).map((keyword) => normalizeSentence(`Focus area ${keyword}`)));

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const clean = candidate.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const key = normalizeIdea(clean);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(clean.endsWith(".") ? clean : `${clean}.`);
    if (unique.length >= limit) break;
  }

  if (unique.length === 0) {
    unique.push("Prioritize the most critical details from the provided context.");
  }

  return unique;
}

function buildSummarySentence(context: string, tone: ToneOption): string {
  const scale = getInputScale(context);
  if (scale === "short") return buildShortSummarySentence(context, tone);
  const questionPrompt = extractQuestionPrompt(context);
  if (questionPrompt) return buildQuestionStyleSummary(questionPrompt, tone);

  const sentences = splitSentences(context);
  const firstWordLimit = scale === "medium" ? 12 : 18;
  const secondWordLimit = scale === "medium" ? 0 : 12;
  const first = trimToWords(sentences[0] ?? context, firstWordLimit);
  const second = secondWordLimit > 0 && sentences[1] ? ` ${trimToWords(sentences[1], secondWordLimit)}` : "";
  const opener = pickRandom(OPENING_PHRASES);
  const body = `${first}${second}`.replace(/\s+/g, " ").trim();

  if (tone === "casual") {
    return `${opener} ${body}`;
  }

  return `${opener} ${body}`;
}

function buildAnswerSentence(context: string, question: string, tone: ToneOption): string {
  const scale = getInputScale(context);
  if (scale === "short") return buildShortAnswerSentence(context, question);

  const sentences = splitSentences(context);
  const ranked = rankSentencesByKeywords(sentences, extractKeywords(question));
  const supportCount = scale === "medium" ? 1 : 2;
  const supportWords = scale === "medium" ? 11 : 14;
  const supporting = ranked.slice(0, supportCount).map((line) => trimToWords(line, supportWords)).join(" ");
  const opener = pickRandom(OPENING_PHRASES);
  const questionLead =
    tone === "formal"
      ? `the response to "${trimToWords(question, 10)}" is:`
      : `for "${trimToWords(question, 10)}", here is the response:`;
  return `${opener} ${questionLead} ${supporting || trimToWords(context, 18)}`.replace(/\s+/g, " ").trim();
}

function composeSections(
  primaryTitle: string,
  primaryText: string,
  keyTitle: string,
  bullets: string[],
): string {
  const primaryBlock = `${primaryTitle}:\n${primaryText}`;
  const keyBlock = `${keyTitle}:\n${bullets.map((line) => `- ${line.replace(/^-+\s*/, "")}`).join("\n")}`;
  const keyFirst = Math.random() < 0.42;
  return keyFirst ? `${keyBlock}\n\n${primaryBlock}` : `${primaryBlock}\n\n${keyBlock}`;
}

function buildDynamicSummary(context: string, tone: ToneOption): string {
  const scale = getInputScale(context);
  const title = pickRandom(SUMMARY_TITLES);
  const keyTitle = pickRandom(KEY_POINT_TITLES);
  const summary = buildSummarySentence(context, tone);
  const bulletLimit = scale === "short" ? 2 : scale === "medium" ? 3 : 4;
  const bullets = buildUniqueBullets(context, undefined, bulletLimit);
  return composeSections(title, summary, keyTitle, bullets);
}

function buildDynamicAnswer(context: string, question: string, tone: ToneOption): string {
  const scale = getInputScale(context);
  const title = pickRandom(ANSWER_TITLES);
  const keyTitle = pickRandom(KEY_POINT_TITLES);
  const answer = buildAnswerSentence(context, question, tone);
  const bulletLimit = scale === "short" ? 2 : scale === "medium" ? 3 : 5;
  const bullets = buildUniqueBullets(context, question, bulletLimit);
  return composeSections(title, answer, keyTitle, bullets);
}

function keyPointLimitByScale(context: string): number {
  const scale = getInputScale(context);
  if (scale === "short") return 3;
  if (scale === "medium") return 4;
  return 5;
}

function looksLikeHeading(line: string): boolean {
  return /^(summary|quick summary|overview|answer|direct answer|response|key points?|highlights|main takeaways?)\s*:?\s*$/i.test(
    line,
  );
}

function looksLikeIntro(line: string): boolean {
  return /^(based on|from the|here (are|is)|the context|considering|analyzing|in summary)/i.test(line);
}

function normalizeKeyPointsOutput(rawOutput: string, context: string, question?: string): string {
  const limit = keyPointLimitByScale(context);

  const lines = rawOutput
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => cleanLineValue(line))
    .filter(Boolean);

  const sentences = rawOutput
    .replace(/\r\n/g, " ")
    .split(/[.!?]\s+/)
    .map((part) => cleanLineValue(part))
    .filter(Boolean);

  const candidates = [...lines, ...sentences];
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (looksLikeHeading(candidate) || looksLikeIntro(candidate)) continue;
    const compact = trimToWords(candidate, KEY_POINT_WORD_LIMIT).replace(/[.!?]+$/, "");
    if (!compact) continue;
    const key = normalizeIdea(compact);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(`${compact}.`);
    if (unique.length >= limit) break;
  }

  if (unique.length === 0) {
    throw new Error("Model returned empty key points.");
  }

  return `Key Points:\n${unique.map((item) => `- ${item}`).join("\n")}`;
}

function ensureOutput(value: string, fallbackValue: string): string {
  const clean = value.trim();
  return clean || fallbackValue;
}

async function runSummary(context: string, tone: ToneOption): Promise<ActionResult> {
  const output = await postJson("/generate", { prompt: buildSummaryPrompt(context, tone) });
  return {
    output: ensureOutput(output, ""),
    mode: "summary",
    source: "generate-api",
  };
}

async function runQA(context: string, question: string, tone: ToneOption): Promise<ActionResult> {
  try {
    const output = await postJson("/ask", { text: context, question });
    return {
      output: ensureOutput(output, ""),
      mode: "qa",
      source: "ask-api",
    };
  } catch (askError) {
    console.error("Q&A /ask request failed", askError);
    try {
      const output = await postJson("/generate", { prompt: buildQAPrompt(context, question, tone) });
      return {
        output: ensureOutput(output, ""),
        mode: "qa",
        source: "smart-fallback",
      };
    } catch (fallbackError) {
      console.error("Q&A fallback /generate request failed", fallbackError);
      throw fallbackError;
    }
  }
}

async function runKeyPoints(context: string, question: string | undefined, tone: ToneOption): Promise<ActionResult> {
  const output = await postJson("/generate", {
    prompt: buildKeyPointsPrompt(context, question, tone),
  });
  return {
    output: normalizeKeyPointsOutput(ensureOutput(output, ""), context, question),
    mode: "key_points",
    source: "generate-api",
  };
}

async function runDirectQuestion(question: string, tone: ToneOption): Promise<ActionResult> {
  const prompt = [
    "Answer the user request directly with practical recommendations.",
    "Do not describe or analyze the user's prompt.",
    "Return a concise answer followed by 3 practical bullet points.",
    toneInstruction(tone),
    "",
    `User request:\n${question}`,
  ].join("\n");

  const output = await postJson("/generate", { prompt });
  return {
    output: ensureOutput(output, ""),
    mode: "qa",
    source: "generate-api",
  };
}

export async function runSmartWorkflow(request: SmartWorkflowRequest): Promise<ActionResult> {
  const context = request.context.trim();
  const question = request.question?.trim();

  if (!context) {
    return {
      output: buildDynamicSummary("No context provided.", request.tone),
      mode: "summary",
      source: "mock",
    };
  }

  if (request.modePreference === "key_points") {
    return runKeyPoints(context, question, request.tone);
  }

  if (question) {
    return runQA(context, question, request.tone);
  }

  if (isAnswerIntentText(context)) {
    return runDirectQuestion(context, request.tone);
  }

  return runSummary(context, request.tone);
}

export function generateResponse(context: string, question?: string) {
  const clean = context?.trim() || "";

  if (clean.length < 20) {
    return {
      summary: "Simple input. No detailed analysis needed.",
      keyPoints: [
        "Minimal content provided",
        "No meaningful insights available"
      ]
    };
  }

  const sentences = clean
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const summary = sentences[0] || clean;

  const keyPoints = sentences.slice(1, 4).map((s) => `• ${s}`);

  return {
    summary,
    keyPoints: keyPoints.length ? keyPoints : ["• Key idea extracted from context"]
  };
}
