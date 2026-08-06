import LegacyClientApp from "../legacy-client-app";
import PublicLandingEntry from "../public-landing-entry";
import { notFound } from "next/navigation";
import { isKnownLegacyRoute } from "../../lib/knownLegacyRoutes";

export default async function CatchAllPage({ params }) {
  const { slug = [] } = await params;

  if (slug.length === 0) {
    return <PublicLandingEntry />;
  }

  if (!isKnownLegacyRoute(slug)) {
    notFound();
  }

  return <LegacyClientApp />;
}
