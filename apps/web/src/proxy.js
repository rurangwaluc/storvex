import { NextResponse } from "next/server";

import { isKnownLegacyRoute } from "./lib/knownLegacyRoutes";
import { isSolutionPageSlug } from "./lib/seo/solutionPages";
import { isIndustryPageSlug } from "./lib/seo/industryPages";

const EXPLICIT_APP_ROUTES = new Set(["offline"]);

export function proxy(request) {
  const segments = request.nextUrl.pathname
    .split("/")
    .filter(Boolean);

  const isSolutionPage =
    segments.length === 2 &&
    segments[0] === "solutions" &&
    isSolutionPageSlug(segments[1]);

  const isIndustryPage =
    segments.length === 2 &&
    segments[0] === "industries" &&
    isIndustryPageSlug(segments[1]);

  if (
    EXPLICIT_APP_ROUTES.has(segments.join("/")) ||
    isIndustryPage ||
    isSolutionPage ||
    isKnownLegacyRoute(segments)
  ) {
    return NextResponse.next();
  }

  return new NextResponse(
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"robots\" content=\"noindex,nofollow,noarchive\"><title>Page not found — Storvex</title></head><body><main><h1>Page not found</h1><p>The page you requested does not exist.</p><a href=\"/\">Return to Storvex</a></main></body></html>",
    {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
