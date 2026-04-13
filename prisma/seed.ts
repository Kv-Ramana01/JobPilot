// prisma/seed.ts — run with: npm run db:seed
import { PrismaClient, JobSource, WorkType, JobType, ExperienceLevel } from "@prisma/client";
const db = new PrismaClient();

const CORE_JOBS = [
  { externalId:"s-001", source:JobSource.GREENHOUSE, title:"Software Engineer, Payments", company:"Stripe", companyLogo:"https://logo.clearbit.com/stripe.com", location:"San Francisco / Remote", country:"USA", isRemote:true, workType:WorkType.REMOTE, jobType:JobType.FULL_TIME, experienceLevel:ExperienceLevel.JUNIOR, salaryMin:120000, salaryMax:160000, currency:"USD", skills:["TypeScript","Go","PostgreSQL","Redis","gRPC"], description:"<p>Join Stripe's Payments team and build the financial infrastructure of the internet. Process millions of transactions daily for Amazon, Shopify, and Lyft.</p>", sourceUrl:"https://stripe.com/jobs", visaSponsorship:true, postedAt:new Date(Date.now()-86400000) },
  { externalId:"s-002", source:JobSource.LEVER, title:"Frontend Developer Intern", company:"Figma", companyLogo:"https://logo.clearbit.com/figma.com", location:"Remote Worldwide", country:"USA", isRemote:true, workType:WorkType.REMOTE, jobType:JobType.INTERNSHIP, experienceLevel:ExperienceLevel.FRESHER, salaryMin:55, salaryMax:70, currency:"USD", skills:["React","TypeScript","WebGL","CSS"], description:"<p>12-week paid internship building UI components used by millions of designers. Potential for full-time conversion.</p>", sourceUrl:"https://figma.com/careers", visaSponsorship:false, postedAt:new Date(Date.now()-172800000) },
  { externalId:"s-003", source:JobSource.GREENHOUSE, title:"Full Stack Engineer", company:"Notion", companyLogo:"https://logo.clearbit.com/notion.so", location:"New York / Remote", country:"USA", isRemote:true, workType:WorkType.HYBRID, jobType:JobType.FULL_TIME, experienceLevel:ExperienceLevel.JUNIOR, salaryMin:100000, salaryMax:140000, currency:"USD", skills:["React","TypeScript","Python","PostgreSQL","Redis"], description:"<p>Join a small autonomous team working on core product areas. High ownership and real impact from day one serving 30M+ users.</p>", sourceUrl:"https://notion.so/careers", visaSponsorship:true, postedAt:new Date(Date.now()-259200000) },
  { externalId:"s-004", source:JobSource.REMOTIVE, title:"Software Engineer — Product", company:"Linear", companyLogo:"https://logo.clearbit.com/linear.app", location:"Remote Worldwide", country:"USA", isRemote:true, workType:WorkType.REMOTE, jobType:JobType.FULL_TIME, experienceLevel:ExperienceLevel.JUNIOR, salaryMin:95000, salaryMax:135000, currency:"USD", skills:["TypeScript","React","Node.js","GraphQL","PostgreSQL"], description:"<p>Work on core product features for the world's best engineering teams. Lots of autonomy and direct product impact.</p>", sourceUrl:"https://linear.app/careers", visaSponsorship:false, postedAt:new Date(Date.now()-345600000) },
  { externalId:"s-005", source:JobSource.LEVER, title:"Software Engineer — DX", company:"Vercel", companyLogo:"https://logo.clearbit.com/vercel.com", location:"Remote Worldwide", country:"USA", isRemote:true, workType:WorkType.REMOTE, jobType:JobType.FULL_TIME, experienceLevel:ExperienceLevel.JUNIOR, salaryMin:110000, salaryMax:155000, currency:"USD", skills:["TypeScript","Next.js","React","Node.js","Rust"], description:"<p>Build the tooling, SDKs, and CLI that make every Vercel developer more productive. Powers millions of deployments per day.</p>", sourceUrl:"https://vercel.com/careers", visaSponsorship:true, postedAt:new Date(Date.now()-86400000*3) },
  { externalId:"s-006", source:JobSource.GREENHOUSE, title:"Backend Engineer — Postgres", company:"Supabase", companyLogo:"https://logo.clearbit.com/supabase.com", location:"Remote Worldwide", country:"USA", isRemote:true, workType:WorkType.REMOTE, jobType:JobType.FULL_TIME, experienceLevel:ExperienceLevel.JUNIOR, salaryMin:90000, salaryMax:130000, currency:"USD", skills:["PostgreSQL","Go","Rust","TypeScript","Docker"], description:"<p>Build the open source Firebase alternative. Work on connection pooling, row-level security, realtime subscriptions, and storage.</p>", sourceUrl:"https://supabase.com/careers", visaSponsorship:true, postedAt:new Date(Date.now()-86400000*2) },
  { externalId:"s-007", source:JobSource.GREENHOUSE, title:"SDE-1 — Frontend Platform", company:"Razorpay", companyLogo:"https://logo.clearbit.com/razorpay.com", location:"Bengaluru, India", country:"India", isRemote:false, workType:WorkType.HYBRID, jobType:JobType.FULL_TIME, experienceLevel:ExperienceLevel.FRESHER, salaryMin:1200000, salaryMax:1800000, currency:"INR", skills:["React","TypeScript","JavaScript","CSS","Node.js"], description:"<p>Build shared UI component libraries that power all Razorpay products. Work with 200+ frontend engineers at India's leading payments company.</p>", sourceUrl:"https://razorpay.com/jobs", visaSponsorship:false, postedAt:new Date(Date.now()-86400000) },
  { externalId:"s-008", source:JobSource.REMOTIVE, title:"ML Engineer Intern", company:"Hugging Face", companyLogo:"https://logo.clearbit.com/huggingface.co", location:"Remote Worldwide", country:"USA", isRemote:true, workType:WorkType.REMOTE, jobType:JobType.INTERNSHIP, experienceLevel:ExperienceLevel.FRESHER, salaryMin:60, salaryMax:80, currency:"USD", skills:["Python","PyTorch","Transformers","CUDA","NLP"], description:"<p>Work on state-of-the-art language models, contribute to open-source libraries used by millions, and potentially publish your research.</p>", sourceUrl:"https://apply.workable.com/huggingface", visaSponsorship:false, postedAt:new Date(Date.now()-86400000) },
  { externalId:"s-009", source:JobSource.REMOTIVE, title:"Full Stack Engineer", company:"PostHog", companyLogo:"https://logo.clearbit.com/posthog.com", location:"Remote Worldwide", country:"UK", isRemote:true, workType:WorkType.REMOTE, jobType:JobType.FULL_TIME, experienceLevel:ExperienceLevel.JUNIOR, salaryMin:65000, salaryMax:100000, currency:"USD", skills:["Python","Django","React","TypeScript","ClickHouse"], description:"<p>Fully remote, profitable, and growing fast. Ship more features in a month than most companies do in a year at the open source product analytics platform.</p>", sourceUrl:"https://posthog.com/careers", visaSponsorship:false, postedAt:new Date(Date.now()-86400000*6) },
  { externalId:"s-010", source:JobSource.LEVER, title:"Frontend Engineer — Design Systems", company:"Atlassian", companyLogo:"https://logo.clearbit.com/atlassian.com", location:"Sydney / Remote", country:"Australia", isRemote:true, workType:WorkType.HYBRID, jobType:JobType.FULL_TIME, experienceLevel:ExperienceLevel.JUNIOR, salaryMin:85000, salaryMax:120000, currency:"USD", skills:["React","TypeScript","CSS","Storybook","Accessibility"], description:"<p>Build the component library powering Jira, Confluence, and Trello. Impact 300,000+ companies worldwide.</p>", sourceUrl:"https://atlassian.com/company/careers", visaSponsorship:true, postedAt:new Date(Date.now()-86400000*7) },
  { externalId:"s-011", source:JobSource.GREENHOUSE, title:"Frontend Engineer Intern", company:"Groww", companyLogo:"https://logo.clearbit.com/groww.in", location:"Bengaluru, India", country:"India", isRemote:false, workType:WorkType.ONSITE, jobType:JobType.INTERNSHIP, experienceLevel:ExperienceLevel.FRESHER, salaryMin:40000, salaryMax:60000, currency:"INR", skills:["React","JavaScript","CSS","TypeScript"], description:"<p>Help 50M+ Indians invest for the first time. Build the frontend for India's leading investment platform.</p>", sourceUrl:"https://groww.in/careers", visaSponsorship:false, postedAt:new Date(Date.now()-86400000*2) },
  { externalId:"s-012", source:JobSource.REMOTIVE, title:"Backend Engineer — Go", company:"PlanetScale", companyLogo:"https://logo.clearbit.com/planetscale.com", location:"Remote Worldwide", country:"USA", isRemote:true, workType:WorkType.REMOTE, jobType:JobType.FULL_TIME, experienceLevel:ExperienceLevel.JUNIOR, salaryMin:90000, salaryMax:130000, currency:"USD", skills:["Go","MySQL","Kubernetes","gRPC","Vitess"], description:"<p>Build the world's most scalable MySQL-compatible database platform. Our tech is based on Vitess, which powers YouTube and Slack.</p>", sourceUrl:"https://planetscale.com/careers", visaSponsorship:false, postedAt:new Date(Date.now()-86400000*4) },
];

const EXTRA_COMPANIES = ["Shopify","GitHub","Cloudflare","HashiCorp","Grafana Labs","Prisma","Resend","Upstash","Railway","Fly.io","Render","Deno","Bun","Zed Industries","Codeium","Cursor","Neon","Turso","Liveblocks","Temporal","Retool","AppSmith","ToolJet","Twenty CRM","Sanity","Contentful","Hygraph","Appwrite","Directus","Medusa","Trigger.dev","Inngest","Windmill","Payload CMS","Tiptap","Storyblok","Clerk","WorkOS"];
const EXTRA_ROLES = ["Junior Software Engineer","Backend Developer","Frontend Engineer","Full Stack Developer","DevOps Engineer","SDE-1","React Developer","Node.js Engineer","Python Developer","Mobile Developer","QA Engineer","Software Engineer Intern"];
const EXTRA_SKILLS = [["JavaScript","React","Node.js"],["Python","Django","PostgreSQL"],["TypeScript","Next.js","Tailwind CSS"],["Go","gRPC","Kubernetes"],["Java","Spring Boot","AWS"],["React Native","TypeScript","iOS"],["Vue.js","Nuxt.js","JavaScript"],["Ruby","Rails","PostgreSQL"],["Rust","WebAssembly","C++"],["Swift","SwiftUI","Xcode"]];

async function main() {
  const extraJobs = Array.from({ length: 38 }, (_, i) => ({
    externalId: `s-extra-${i.toString().padStart(3,"0")}`,
    source: [JobSource.GREENHOUSE,JobSource.LEVER,JobSource.REMOTIVE,JobSource.ADZUNA][i%4] as JobSource,
    title: EXTRA_ROLES[i%EXTRA_ROLES.length],
    company: EXTRA_COMPANIES[i%EXTRA_COMPANIES.length],
    companyLogo: null as string | null,
    location: ["Remote Worldwide","Berlin, Germany","London, UK","Toronto, Canada","Bengaluru, India","Singapore","Amsterdam, Netherlands"][i%7],
    country: ["USA","Germany","UK","Canada","India","Singapore","Netherlands"][i%7],
    isRemote: i%3!==0,
    workType: [WorkType.REMOTE,WorkType.HYBRID,WorkType.ONSITE][i%3] as WorkType,
    jobType: i%6===0 ? JobType.INTERNSHIP : JobType.FULL_TIME as JobType,
    experienceLevel: [ExperienceLevel.FRESHER,ExperienceLevel.JUNIOR,ExperienceLevel.MID][i%3] as ExperienceLevel,
    salaryMin: [60000,70000,80000,90000,100000,1200000,1500000][i%7],
    salaryMax: [90000,105000,120000,135000,150000,1800000,2200000][i%7],
    currency: ["USD","EUR","GBP","CAD","INR","USD","EUR"][i%7],
    skills: EXTRA_SKILLS[i%EXTRA_SKILLS.length] as string[],
    description: `<p>We're a fast-growing technology company building tools developers love. We ship high-quality software every week with a strong engineering culture.</p><p>You'll work on real features, own your projects end-to-end, and grow fast in a collaborative environment.</p>`,
    sourceUrl: `https://example.com/jobs/extra-${i}`,
    visaSponsorship: i%5===0,
    postedAt: new Date(Date.now()-86400000*((i%21)+1)),
    benefits: [] as string[],
    requirements: null as string | null,
  }));

  const allJobs = [...CORE_JOBS, ...extraJobs];
  console.log(`🌱 Seeding ${allJobs.length} jobs…`);
  let created = 0;

  for (const job of allJobs) {
    await db.job.upsert({
      where: { externalId_source: { externalId: job.externalId, source: job.source } },
      create: {
        ...job,
        benefits: "benefits" in job ? job.benefits ?? [] : [],
        requirements: "requirements" in job ? job.requirements : null,
        isActive: true,
        viewCount: Math.floor(Math.random()*300),
        applyCount: Math.floor(Math.random()*50),
      },
      update: { updatedAt: new Date() },
    }).then(()=>created++).catch(()=>{});
  }

  console.log(`✅ Seeded ${created} jobs`);
}

main().catch(e=>{console.error(e);process.exit(1);}).finally(async()=>{await db.$disconnect();});
