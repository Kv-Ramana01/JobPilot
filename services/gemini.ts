// services/gemini.ts
// All Gemini AI integrations for JobPilot

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ResumeAnalysis,
  CoverLetterResult,
  CoverLetterTone,
} from "@/types";

// ─── Model priority list — tries in order until one works ─────────

const MODEL_NAMES = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

// ─── Client (lazy-init) ───────────────────────────────────────────

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set in environment variables");
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

function getModel(name = MODEL_NAMES[0]) {
  return getClient().getGenerativeModel({ model: name });
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Clean Gemini response text to extract JSON.
 * Handles markdown code fences, leading/trailing whitespace, and
 * occasional prefixes like "Here is the JSON:"
 */
function extractJSON(raw: string): string {
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  let clean = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  // If there's a JSON object/array in the text, extract it
  // (handles cases where Gemini adds preamble text)
  const jsonStart = clean.search(/[\[{]/);
  if (jsonStart > 0) {
    clean = clean.slice(jsonStart);
  }

  // Find the matching closing bracket/brace
  const firstChar = clean[0];
  if (firstChar === "[" || firstChar === "{") {
    const closeChar = firstChar === "[" ? "]" : "}";
    const lastIndex = clean.lastIndexOf(closeChar);
    if (lastIndex !== -1) {
      clean = clean.slice(0, lastIndex + 1);
    }
  }

  return clean.trim();
}

/**
 * Generate JSON from Gemini, with model fallback on error.
 */
async function generateJSON<T>(prompt: string, modelName?: string): Promise<T> {
  const modelsToTry = modelName ? [modelName, ...MODEL_NAMES.filter(m => m !== modelName)] : MODEL_NAMES;

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini] Trying model: ${model}`);
      const genModel = getModel(model);

      const result = await genModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      });

      const raw = result.response.text();

      if (!raw || raw.trim() === "") {
        throw new Error("Gemini returned empty response");
      }

      const clean = extractJSON(raw);
      console.log(`[Gemini/${model}] Response length: ${clean.length} chars`);

      const parsed = JSON.parse(clean) as T;
      return parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Gemini/${model}] Error: ${message}`);
      lastError = err instanceof Error ? err : new Error(message);

      // Don't retry on JSON parse errors — the model responded but gave bad JSON
      // Do retry on network/quota/model-not-found errors
      if (message.includes("JSON") || message.includes("Unexpected token")) {
        throw new Error(`Gemini returned invalid JSON. Raw: ${message}`);
      }

      // Rate limit — don't try other models, just throw
      if (message.includes("429") || message.includes("quota") || message.includes("rate")) {
        throw new Error("Gemini rate limit reached. Please try again in a moment.");
      }

      continue;
    }
  }

  throw lastError ?? new Error("All Gemini models failed");
}

// ─── Resume Analysis ──────────────────────────────────────────────

export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  company: string
): Promise<ResumeAnalysis> {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error("Resume text is too short for analysis");
  }
  if (!jobDescription || jobDescription.trim().length < 30) {
    throw new Error("Job description is too short for analysis");
  }

  // Truncate to avoid token limits (keep first ~3000 chars of each)
  const truncatedResume = resumeText.slice(0, 3000);
  const truncatedJD = jobDescription.slice(0, 2000);

  const prompt = `You are an expert ATS (Applicant Tracking System) analyst and technical resume coach.

Analyze this resume against the job description and return ONLY valid JSON — no markdown, no explanation, no preamble.

JOB TITLE: ${jobTitle}
COMPANY: ${company}

JOB DESCRIPTION:
${truncatedJD}

CANDIDATE RESUME:
${truncatedResume}

Return this exact JSON structure (all fields required):
{
  "atsScore": 72,
  "matchScore": 68,
  "missingKeywords": ["keyword1", "keyword2"],
  "presentKeywords": ["keyword3", "keyword4"],
  "skillsGap": ["skill1", "skill2"],
  "summary": "Current resume summary here",
  "improvedSummary": "Improved 3-sentence summary tailored to this role",
  "suggestions": [
    {
      "type": "keyword",
      "priority": "high",
      "original": null,
      "suggestion": "Add TypeScript to skills section",
      "reason": "Job requires TypeScript — not mentioned in resume"
    }
  ],
  "improvedBullets": [
    {
      "original": "Worked on React app",
      "improved": "Built React dashboard reducing page load by 40% for 10k+ daily users",
      "explanation": "Added metrics and user scale for impact"
    }
  ]
}

Rules:
- atsScore and matchScore must be integers 0-100
- missingKeywords: max 8 items
- suggestions: 4-6 items with priority "high"|"medium"|"low"
- improvedBullets: rewrite 3 weakest bullets using STAR method
- Return ONLY the JSON object, nothing else`;

  return generateJSON<ResumeAnalysis>(prompt);
}

// ─── Cover Letter Generator ───────────────────────────────────────

export async function generateCoverLetter(
  userProfile: {
    fullName: string;
    skills: string[];
    experienceLevel: string;
    bio?: string | null;
  },
  job: {
    title: string;
    company: string;
    description: string;
    requirements?: string | null;
  },
  tone: CoverLetterTone = "confident"
): Promise<CoverLetterResult> {
  const toneGuide: Record<CoverLetterTone, string> = {
    formal:
      "Professional and traditional. Conservative vocabulary.",
    confident:
      "Direct and assured. Uses 'I will' not 'I hope to'. Shows ambition without arrogance.",
    friendly:
      "Warm and conversational. Shows personality. Still professional but approachable.",
    concise:
      "Under 200 words. Gets to the point immediately. No filler phrases.",
    detailed:
      "350-450 words. Shows deep research. Connects past experience to role requirements specifically.",
  };

  const truncatedJD = job.description.slice(0, 1500);

  const prompt = `You are an expert cover letter writer for software developers.

Write a ${tone} cover letter. Return ONLY valid JSON — no markdown, no preamble.

TONE: ${toneGuide[tone]}

CANDIDATE:
Name: ${userProfile.fullName}
Experience: ${userProfile.experienceLevel}
Skills: ${userProfile.skills.slice(0, 15).join(", ")}
${userProfile.bio ? `Bio: ${userProfile.bio.slice(0, 200)}` : ""}

JOB:
Title: ${job.title}
Company: ${job.company}
Description: ${truncatedJD}
${job.requirements ? `Requirements: ${job.requirements.slice(0, 500)}` : ""}

Return this exact JSON:
{
  "subject": "Application for ${job.title} at ${job.company}",
  "body": "Dear Hiring Team,\\n\\n[opening paragraph]\\n\\n[middle paragraph with achievements]\\n\\nBest regards,\\n${userProfile.fullName}",
  "tone": "${tone}"
}

Rules:
- body must use \\n for line breaks
- Opening: hook + why this specific company  
- Middle: 1-2 relevant achievements tied to JD requirements
- Closing: clear CTA
- Do NOT use "I am writing to express my interest"
- Do NOT say "I am a passionate" or "I am a quick learner"
- Return ONLY the JSON object`;

  return generateJSON<CoverLetterResult>(prompt);
}

// ─── Interview Prep ───────────────────────────────────────────────

export interface InterviewQuestion {
  question: string;
  category: "behavioral" | "technical" | "situational" | "culture";
  difficulty: "easy" | "medium" | "hard";
  suggestedAnswer: string;
  tips: string[];
}

export async function generateInterviewQuestions(
  jobTitle: string,
  jobDescription: string,
  skills: string[]
): Promise<InterviewQuestion[]> {
  const truncatedJD = jobDescription.slice(0, 1000);

  const prompt = `You are a senior engineering interview coach.

Generate 8 interview questions for this role. Return ONLY a valid JSON array — no markdown, no preamble.

ROLE: ${jobTitle}
JD: ${truncatedJD}
KEY SKILLS: ${skills.slice(0, 10).join(", ")}

Return this exact structure (array of 8 objects):
[
  {
    "question": "Tell me about a time you optimized a slow database query",
    "category": "technical",
    "difficulty": "medium",
    "suggestedAnswer": "Use STAR method: Situation - our checkout page was slow (3s). Task - reduce to under 500ms. Action - added indexes, rewrote N+1 queries, added Redis caching. Result - 85% faster, 20% higher conversion.",
    "tips": ["Be specific about the technology used", "Quantify the improvement"]
  }
]

Mix: 3 technical, 2 behavioral, 2 situational, 1 culture.
Technical questions must be specific to the job's tech stack.
Return ONLY the JSON array, nothing else.`;

  return generateJSON<InterviewQuestion[]>(prompt);
}

// ─── Skills Gap Analysis ──────────────────────────────────────────

export interface SkillsGapResult {
  mustLearn: { skill: string; reason: string; resources: string[] }[];
  niceToHave: { skill: string; reason: string }[];
  strongAlready: string[];
  estimatedPrepWeeks: number;
}

export async function analyzeSkillsGap(
  userSkills: string[],
  jobDescription: string,
  jobTitle: string
): Promise<SkillsGapResult> {
  const truncatedJD = jobDescription.slice(0, 1000);

  const prompt = `You are a technical career coach.

Analyze the skills gap and return ONLY valid JSON — no markdown, no preamble.

CANDIDATE SKILLS: ${userSkills.slice(0, 20).join(", ")}
JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${truncatedJD}

Return this exact JSON:
{
  "mustLearn": [
    {
      "skill": "Kubernetes",
      "reason": "Required for deploying services at this company",
      "resources": ["kubernetes.io/docs", "KodeKloud free tier"]
    }
  ],
  "niceToHave": [
    {
      "skill": "Terraform",
      "reason": "Used by team but not blocking for the role"
    }
  ],
  "strongAlready": ["React", "TypeScript"],
  "estimatedPrepWeeks": 6
}

Return ONLY the JSON object, nothing else.`;

  return generateJSON<SkillsGapResult>(prompt);
}