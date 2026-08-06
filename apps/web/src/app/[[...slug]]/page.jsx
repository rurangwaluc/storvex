import LegacyClientApp from "../legacy-client-app";
import LandingPage from "../../legacy-pages/public/LandingPage";
import { notFound } from "next/navigation";
import { isKnownLegacyRoute } from "../../lib/knownLegacyRoutes";

export default async function CatchAllPage({ params }) {
  const { slug = [] } = await params;

  if (slug.length === 0) {
    return <LandingPage />;
  }

  if (!isKnownLegacyRoute(slug)) {
    notFound();
  }

  return <LegacyClientApp />;
}
