// // middleware.ts
// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";

// // Routes accessible without authentication
// const isPublicRoute = createRouteMatcher([
//   "/",
//   "/sign-in(.*)",
//   "/sign-up(.*)",
//   "/onboarding(.*)",
//   "/jobs",
//   "/jobs/(.*)",
//   "/api/jobs(.*)",
//   "/api/webhooks(.*)",
// ]);

// // Auth pages — redirect logged-in users to dashboard
// const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

// export default clerkMiddleware(async (auth, req) => {
//   const { userId } = await auth();

//   // Signed-in users visiting /sign-in or /sign-up → dashboard
//   if (userId && isAuthRoute(req)) {
//     return NextResponse.redirect(new URL("/dashboard", req.url));
//   }

//   // Protect private routes
//   if (!isPublicRoute(req)) {
//     await auth.protect();
//   }
// });

// export const config = {
//   matcher: [
//     "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
//     "/(api|trpc)(.*)",
//   ],
// };

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/jobs",
  "/jobs/(.*)",
  "/api/jobs(.*)",
  "/api/webhooks(.*)",
]);

const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (userId && isAuthRoute(req)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isPublicRoute(req) && !userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};