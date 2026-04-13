// services/gemini.ts
// All Gemini AI integrations for JobPilot

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ResumeAnalysis,
  CoverLetterResult,
  CoverLetterTone,
} from "@/types";

// ─── Client (lazy-init) ───────────────────────────────────────────

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set");
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

function getModel(name = "gemini-1.5-flash") {
  return getClient().getGenerativeModel({ model: name });
}

// ─── Helpers ──────────────────────────────────────────────────────

async function generateJSON<T>(prompt: string): Promise<T> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  // Strip markdown code fences if present
  const clean = raw
    .replace(/^```json\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  return JSON.parse(clean) as T;
}

// ─── Resume Analysis ──────────────────────────────────────────────

export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
  jobTitle: string,
  company: string
): Promise<ResumeAnalysis> {
  const prompt = `
You are an expert ATS (Applicant Tracking System) analyst and technical resume coach.

Analyze this resume against the job description below and return a JSON response ONLY — no markdown, no preamble.

JOB TITLE: ${jobTitle}
COMPANY: ${company}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${resumeText}

Return exactly this JSON structure:
{
  "atsScore": <integer 0-100, strict ATS keyword match>,
  "matchScore": <integer 0-100, overall fit including soft signals>,
  "missingKeywords": [<strings — important keywords from JD not in resume>],
  "presentKeywords": [<strings — JD keywords already in resume>],
  "skillsGap": [<strings — skills the candidate should learn/add for this role>],
  "summary": "<current resume summary or first impression>",
  "improvedSummary": "<rewritten 3-sentence professional summary tailored to this role>",
  "suggestions": [
    {
      "type": "<keyword|structure|quantify|format|tone>",
      "priority": "<high|medium|low>",
      "original": "<original text if applicable, else null>",
      "suggestion": "<specific actionable change>",
      "reason": "<why this improves the resume>"
    }
  ],
  "improvedBullets": [
    {
      "original": "<existing bullet point>",
      "improved": "<rewritten bullet with stronger action verb, metrics, keywords>",
      "explanation": "<what changed and why>"
    }
  ]
}

Rules:
- Be specific and actionable, not generic
- Prioritize suggestions by impact on ATS score
- Improved bullets must use the STAR/XYZ method
- Add real keywords from the JD
- Quantify wherever possible (even estimated: "~20% improvement")
- missingKeywords should have at most 10 items
- suggestions should have 4-6 items
- improvedBullets should rewrite 3-4 of the weakest bullets
`;

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
      "Professional and traditional. Third-person references acceptable. Conservative vocabulary.",
    confident:
      "Direct and assured. Uses 'I will' not 'I hope to'. Shows ambition without arrogance.",
    friendly:
      "Warm and conversational. Shows personality. Still professional but approachable.",
    concise:
      "Under 200 words. Gets to the point immediately. No filler phrases.",
    detailed:
      "350-450 words. Shows deep research about the company. Connects experiences to role requirements specifically.",
  };

  const prompt = `
You are an expert cover letter writer who helps software developers land jobs.

Write a ${tone} cover letter and return JSON ONLY — no markdown, no preamble.

TONE GUIDE: ${toneGuide[tone]}

CANDIDATE:
Name: ${userProfile.fullName}
Experience level: ${userProfile.experienceLevel}
Skills: ${userProfile.skills.join(", ")}
${userProfile.bio ? `Bio: ${userProfile.bio}` : ""}

JOB:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
${job.requirements ? `Requirements: ${job.requirements}` : ""}

Return exactly this JSON:
{
  "subject": "<email subject line>",
  "body": "<full cover letter body — use \\n for line breaks>",
  "tone": "${tone}"
}

Rules:
- Opening paragraph: hook + why this specific company
- Middle: 1-2 most relevant achievements tied to JD requirements
- Closing: clear CTA, confident sign-off
- Do NOT use clichés like "I am writing to express my interest"
- Do NOT say "I am a quick learner" or "I am passionate"
- Use the candidate's actual skills; don't invent experience
- The body should start with "Dear Hiring Team," or a specific name if known
`;

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
  const prompt = `
You are a senior engineering interview coach.

Generate 8 interview questions for this role and return JSON ONLY — no markdown.

ROLE: ${jobTitle}
JD: ${jobDescription}
KEY SKILLS: ${skills.join(", ")}

Return an array of exactly 8 objects:
[
  {
    "question": "<interview question>",
    "category": "<behavioral|technical|situational|culture>",
    "difficulty": "<easy|medium|hard>",
    "suggestedAnswer": "<model answer using STAR method where applicable>",
    "tips": ["<tip 1>", "<tip 2>"]
  }
]

Mix: 3 technical, 2 behavioral, 2 situational, 1 culture.
Make technical questions specific to the job's tech stack.
`;

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
  const prompt = `
You are a technical career coach.

Analyze the skills gap between a candidate and a job. Return JSON ONLY.

CANDIDATE SKILLS: ${userSkills.join(", ")}
JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription}

Return exactly this structure:
{
  "mustLearn": [
    {
      "skill": "<skill name>",
      "reason": "<why this is critical for the role>",
      "resources": ["<free resource URL or name>"]
    }
  ],
  "niceToHave": [
    {
      "skill": "<skill name>",
      "reason": "<why helpful but not blocking>"
    }
  ],
  "strongAlready": ["<skills the candidate has that match well>"],
  "estimatedPrepWeeks": <integer — realistic weeks to fill the gap with ~2 hrs/day>
}
`;

  return generateJSON<SkillsGapResult>(prompt);
}
