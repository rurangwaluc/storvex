import LegacyClientApp from "../legacy-client-app";
import { notFound } from "next/navigation";
import { isKnownLegacyRoute } from "../../lib/knownLegacyRoutes";

export default async function CatchAllPage({ params }) {
  const { slug = [] } = await params;

  if (!isKnownLegacyRoute(slug)) {
    notFound();
  }

  return <LegacyClientApp />;
}
