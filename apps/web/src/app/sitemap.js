import { solutionPageSlugs } from "../lib/seo/solutionPages";
import { industryPageSlugs } from "../lib/seo/industryPages";

const baseUrl = "https://www.storvex.rw";

export default function sitemap() {
  const lastModified = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/marketplace/stores`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...solutionPageSlugs.map((slug) => ({
      url: `${baseUrl}/solutions/${slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
    ...industryPageSlugs.map((slug) => ({
      url: `${baseUrl}/industries/${slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
  ];
}
