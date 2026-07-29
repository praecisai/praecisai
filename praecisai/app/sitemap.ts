import type { MetadataRoute } from 'next';
import { industries } from '@/lib/content/industries';
import { caseStudies } from '@/lib/content/case-studies';

const SITE_URL = 'https://www.praecisai.in';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const core: MetadataRoute.Sitemap = ([
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/features`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/industries`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/case-studies`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/about`, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ] satisfies Omit<MetadataRoute.Sitemap[number], 'lastModified'>[]).map((entry) => ({
    ...entry,
    lastModified,
  }));

  const industryPages: MetadataRoute.Sitemap = industries.map((industry) => ({
    url: `${SITE_URL}/industries/${industry.slug}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  const caseStudyPages: MetadataRoute.Sitemap = caseStudies.map((study) => ({
    url: `${SITE_URL}/case-studies/${study.slug}`,
    lastModified: new Date(study.publishedAt),
    changeFrequency: 'yearly',
    priority: 0.6,
  }));

  return [...core, ...industryPages, ...caseStudyPages];
}
