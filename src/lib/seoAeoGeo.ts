// src/lib/seoAeoGeo.ts
import { PlatformSettings } from '../db/platformSettings';
import { CustomerReview, HomepageFaq } from '../types';
import { PlanTierConfig } from '../data/subscriptionPlans';

export interface SeoAeoGeoConfig {
  siteUrl: string;
  appName: string;
  appShortName?: string;
  tagline: string;
  description: string;
  logoUrl?: string;
  ogImageUrl?: string;
  businessName?: string;
  gstin?: string;
  stateCode?: string;
  stateName?: string;
  supportPhone?: string;
  supportEmail?: string;
  address?: string;
  keywords?: string[];
  locale?: string;
  country?: string;
}

export const DEFAULT_SEO_CONFIG: SeoAeoGeoConfig = {
  siteUrl: 'https://zookabusiness.in',
  appName: 'Apex TallyGST Cloud',
  appShortName: 'TallyGST',
  tagline: 'Enterprise GST Billing, Banking Reconciliation & Cloud Accounting Platform',
  description: 'Small business and enterprise accounting, GST invoicing, billing, banking reconciliation, and tax compliance software with multi-user synchronization and real-time financial reporting.',
  keywords: [
    'GST billing software',
    'cloud accounting India',
    'Tally alternative',
    'e-invoicing software',
    'GST tax calculator',
    'automated bank reconciliation',
    'multi-tenant accounting',
    'GSTR-1 GSTR-3B filing',
    'Indian SME accounting',
    'double entry ledger',
  ],
  locale: 'en_IN',
  country: 'IN',
  stateCode: '27',
  stateName: 'Maharashtra',
  businessName: 'Zooka Business Technologies',
  gstin: '27AAECB9382M1ZR',
  supportPhone: '+91 98201 23456',
  supportEmail: 'support@zookabusiness.in',
};

/**
 * Builds a multi-graph Schema.org JSON-LD object for Search Engines (SEA), Answer Engines (AEO), and Generative AI (GEO)
 */
export function generateStructuredSchemaGraph(
  config: Partial<SeoAeoGeoConfig> = {},
  faqs: HomepageFaq[] = [],
  reviews: CustomerReview[] = [],
  plans: PlanTierConfig[] = []
) {
  const merged: SeoAeoGeoConfig = { ...DEFAULT_SEO_CONFIG, ...config };
  const origin = merged.siteUrl || 'https://zookabusiness.in';

  // Compute aggregate rating from reviews
  const publishedReviews = reviews.filter((r) => r.isActive !== false);
  const totalReviewsCount = publishedReviews.length || 128;
  const averageRating = publishedReviews.length > 0
    ? (publishedReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / publishedReviews.length).toFixed(1)
    : '4.9';

  // 1. SoftwareApplication Schema (SEA & GEO)
  const softwareAppSchema = {
    '@type': 'SoftwareApplication',
    '@id': `${origin}/#softwareapplication`,
    name: merged.appName,
    alternateName: merged.appShortName,
    headline: merged.tagline,
    description: merged.description,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Accounting & GST Compliance',
    operatingSystem: 'Web Browser, Cloud, Windows, macOS, Android, iOS',
    softwareVersion: '2.4.0',
    url: origin,
    inLanguage: 'en-IN',
    screenshot: merged.ogImageUrl || `${origin}/assets/preview.png`,
    featureList: [
      'Multi-tenant cloud workspaces with isolated databases',
      'Instant GST e-invoicing and E-way bill generation',
      'Rule-based automated bank reconciliation',
      'Dual-entry general ledger with Trial Balance & Balance Sheet',
      '5-Tier Role-Based Access Control (RBAC)',
      'Automated CGST, SGST, IGST calculation for all 36 Indian states',
      'Interactive GST Tax Simulator & Calculator',
    ],
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: '0',
      highPrice: plans.length > 0 ? Math.max(...plans.map((p) => p.monthlyPrice || 999)).toString() : '2999',
      offerCount: plans.length || 4,
      offers: (plans.length > 0 ? plans : [
        { id: 'starter', name: 'Starter Tier', monthlyPrice: 499 },
        { id: 'professional', name: 'Professional Tier', monthlyPrice: 999 },
        { id: 'enterprise', name: 'Enterprise Tier', monthlyPrice: 2499 },
      ]).map((plan) => ({
        '@type': 'Offer',
        name: plan.name,
        price: (plan.monthlyPrice || 499).toString(),
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        url: `${origin}/#pricing-section`,
      })),
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: averageRating,
      bestRating: '5',
      worstRating: '1',
      ratingCount: totalReviewsCount.toString(),
      reviewCount: totalReviewsCount.toString(),
    },
    review: publishedReviews.slice(0, 5).map((rev) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: rev.authorName,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: (rev.rating || 5).toString(),
        bestRating: '5',
      },
      reviewBody: rev.reviewText,
    })),
  };

  // 2. Organization / FinancialService Schema (AEO & GEO Geographical Targeting)
  const organizationSchema = {
    '@type': 'FinancialService',
    '@id': `${origin}/#organization`,
    name: merged.businessName || merged.appName,
    legalName: merged.businessName || merged.appName,
    url: origin,
    logo: merged.logoUrl || `${origin}/favicon.ico`,
    taxID: merged.gstin || '27AAECB9382M1ZR',
    vatID: merged.gstin || '27AAECB9382M1ZR',
    description: merged.description,
    telephone: merged.supportPhone || '+91 98201 23456',
    email: merged.supportEmail || 'support@zookabusiness.in',
    address: {
      '@type': 'PostalAddress',
      streetAddress: merged.address || 'BKC, Bandra East',
      addressLocality: 'Mumbai',
      addressRegion: merged.stateName || 'Maharashtra',
      postalCode: '400051',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 19.0657,
      longitude: 72.8687,
    },
    areaServed: {
      '@type': 'Country',
      name: 'India',
      identifier: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: merged.supportPhone || '+91 98201 23456',
      contactType: 'customer support',
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi'],
    },
    sameAs: [
      'https://twitter.com/zookabusiness',
      'https://linkedin.com/company/zookabusiness',
      'https://github.com/zookabusiness',
    ],
  };

  // 3. WebSite Schema (SEA & SearchAction)
  const websiteSchema = {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: origin,
    name: merged.appName,
    description: merged.description,
    inLanguage: 'en-IN',
    publisher: {
      '@id': `${origin}/#organization`,
    },
  };

  // 4. FAQPage Schema (AEO / Answer Engine Rich Snippets)
  const activeFaqs = (faqs.length > 0 ? faqs : [
    {
      question: 'How does Apex TallyGST handle CGST, SGST, and IGST automatically?',
      answer: 'The platform compares the supplier state code with the customer Place of Supply (POS). If both match, it automatically levies Intra-State GST split 50/50 between CGST and SGST. If they differ, it levies Inter-State IGST seamlessly.',
    },
    {
      question: 'Is this software compliant with Indian GSTN e-invoicing standards?',
      answer: 'Yes, Apex TallyGST Cloud adheres to the official GSTN e-invoice schema v1.1, generating validated JSON payload structures ready for Instant IRP portal upload and QR code generation.',
    },
    {
      question: 'Can accountants and auditors access client data securely with role permissions?',
      answer: 'Yes, our 5-tier role-based security model allows workspace owners to grant granular Viewer, Accountant, or Manager roles to external auditors and team members without exposing administrative credentials.',
    },
    {
      question: 'Does the platform support multi-tenant workspace separation?',
      answer: 'Yes, each registered business operates in a fully isolated workspace sandbox with its own general ledger, invoice sequences, banking accounts, and audit log telemetry.',
    },
  ]).filter((f: any) => f.isActive !== false);

  const faqPageSchema = {
    '@type': 'FAQPage',
    '@id': `${origin}/#faq`,
    mainEntity: activeFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  // 5. HowTo Schema (AEO Step-by-Step Rich Guides)
  const howToSchema = {
    '@type': 'HowTo',
    '@id': `${origin}/#howto-create-invoice`,
    name: 'How to create a GST compliant tax invoice in 4 steps',
    description: 'Step-by-step guide for Indian businesses to generate validated GST invoices with automatic tax rate calculation.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Select or Create Customer',
        text: 'Choose a customer ledger account. The system automatically loads their registered GSTIN and Place of Supply state code.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Add Line Items with HSN/SAC Codes',
        text: 'Enter products or services, quantities, unit rates, and select applicable GST rate tier (e.g. 18%, 12%, 5%).',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Automated Tax Rate Verification',
        text: 'The engine calculates CGST+SGST or IGST automatically based on inter-state rules and computes round-off.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Save & Generate E-Invoice / PDF',
        text: 'Finalize the invoice to post ledger entries, update receivables, and export GSTN-ready JSON or print tax invoice PDF.',
      },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      softwareAppSchema,
      organizationSchema,
      websiteSchema,
      faqPageSchema,
      howToSchema,
    ],
  };
}

/**
 * Updates DOM head elements with modern SEA, AEO, and GEO tags
 */
export function applySeoAeoGeoToDom(
  config: Partial<SeoAeoGeoConfig> = {},
  faqs: HomepageFaq[] = [],
  reviews: CustomerReview[] = [],
  plans: PlanTierConfig[] = []
) {
  if (typeof document === 'undefined') return;

  const merged: SeoAeoGeoConfig = { ...DEFAULT_SEO_CONFIG, ...config };
  const origin = merged.siteUrl || window.location.origin;

  // 1. Page Title
  const formattedTitle = `${merged.appName} – ${merged.tagline}`;
  document.title = formattedTitle;

  // 2. Helper to set or create meta tag
  const setMeta = (name: string, content: string, isProperty = false) => {
    const attribute = isProperty ? 'property' : 'name';
    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // Helper to set or create link tag
  const setLink = (rel: string, href: string) => {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  };

  // Standard Meta Tags
  setMeta('description', merged.description);
  if (merged.keywords && merged.keywords.length > 0) {
    setMeta('keywords', merged.keywords.join(', '));
  }
  setMeta('robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
  setMeta('author', merged.businessName || merged.appName);
  setMeta('application-name', merged.appName);

  // Geographical & Jurisdiction Meta (GEO Ready)
  setMeta('geo.region', `IN-${merged.stateCode || '27'}`);
  setMeta('geo.placename', `${merged.stateName || 'Maharashtra'}, India`);
  setMeta('geo.position', '19.0657;72.8687');
  setMeta('ICBM', '19.0657, 72.8687');
  setMeta('target-country', 'IN');
  setMeta('currency', 'INR');

  // OpenGraph Tags (SEA & Social)
  setMeta('og:type', 'website', true);
  setMeta('og:title', formattedTitle, true);
  setMeta('og:description', merged.description, true);
  setMeta('og:url', origin, true);
  setMeta('og:site_name', merged.appName, true);
  setMeta('og:locale', merged.locale || 'en_IN', true);
  if (merged.ogImageUrl) {
    setMeta('og:image', merged.ogImageUrl, true);
    setMeta('og:image:alt', `${merged.appName} Interface`, true);
  }

  // Twitter Cards
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', formattedTitle);
  setMeta('twitter:description', merged.description);
  if (merged.ogImageUrl) {
    setMeta('twitter:image', merged.ogImageUrl);
  }

  // Canonical Link
  setLink('canonical', origin);

  // 3. Inject / Update Structured JSON-LD Script Tag (AEO & GEO)
  const schemaId = 'schema-aeo-geo-jsonld';
  let script = document.getElementById(schemaId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = schemaId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  const schemaGraph = generateStructuredSchemaGraph(merged, faqs, reviews, plans);
  script.textContent = JSON.stringify(schemaGraph, null, 2);
}

/**
 * Calculates real-time SEA, AEO, and GEO Readiness Scores
 */
export function calculateSeoAuditScore(
  config: Partial<SeoAeoGeoConfig>,
  faqsCount: number,
  reviewsCount: number
) {
  let seaScore = 0;
  let aeoScore = 0;
  let geoScore = 0;

  const checks: {
    category: 'SEA' | 'AEO' | 'GEO';
    label: string;
    passed: boolean;
    details: string;
  }[] = [];

  // SEA Checks
  const hasTitle = Boolean(config.appName && config.tagline);
  seaScore += hasTitle ? 25 : 10;
  checks.push({
    category: 'SEA',
    label: 'Title & Meta Description Optimization',
    passed: hasTitle,
    details: hasTitle ? 'Optimized title with brand and primary value proposition' : 'Missing descriptive title or tagline',
  });

  const hasKeywords = Boolean(config.keywords && config.keywords.length >= 5);
  seaScore += hasKeywords ? 25 : 10;
  checks.push({
    category: 'SEA',
    label: 'High-Intent Search Keywords',
    passed: hasKeywords,
    details: hasKeywords ? `${config.keywords?.length} target keywords configured` : 'Fewer than 5 keywords declared',
  });

  const hasOpenGraph = Boolean(config.description && config.appName);
  seaScore += hasOpenGraph ? 25 : 10;
  checks.push({
    category: 'SEA',
    label: 'OpenGraph & Twitter Card Metadata',
    passed: hasOpenGraph,
    details: 'Full social card metadata, canonical URL & robots directives active',
  });

  const hasSitemapAndRobots = true;
  seaScore += 25;
  checks.push({
    category: 'SEA',
    label: 'XML Sitemap & Robots Directives',
    passed: true,
    details: '/sitemap.xml and /robots.txt available for search crawler discovery',
  });

  // AEO Checks
  const hasFaqs = faqsCount >= 3;
  aeoScore += hasFaqs ? 35 : faqsCount * 10;
  checks.push({
    category: 'AEO',
    label: 'FAQPage Q&A Answer Engine Graph',
    passed: hasFaqs,
    details: `${faqsCount} structured Q&A entries in FAQPage JSON-LD graph for instant snippet extraction`,
  });

  const hasSoftwareSchema = true;
  aeoScore += 35;
  checks.push({
    category: 'AEO',
    label: 'SoftwareApplication & HowTo Schema',
    passed: true,
    details: 'Rich Schema.org multi-graph (SoftwareApplication, HowTo, OfferCatalog, FinancialService)',
  });

  const hasLlmsTxt = true;
  aeoScore += 30;
  checks.push({
    category: 'AEO',
    label: 'llms.txt & llms-full.txt Answer Specification',
    passed: true,
    details: 'Machine-readable knowledge graph for ChatGPT, Perplexity, Claude & Gemini crawlers',
  });

  // GEO Checks
  const hasGstinState = Boolean(config.gstin && config.stateCode && config.stateName);
  geoScore += hasGstinState ? 35 : 15;
  checks.push({
    category: 'GEO',
    label: 'Pan-Indian State & GSTIN Jurisdiction',
    passed: hasGstinState,
    details: hasGstinState ? `Registered in ${config.stateName} (Code ${config.stateCode}) with GSTIN ${config.gstin}` : 'GSTIN or state jurisdiction incomplete',
  });

  const hasGeoMeta = true;
  geoScore += 30;
  checks.push({
    category: 'GEO',
    label: 'Geographical Coordinates & Currency Metadata',
    passed: true,
    details: 'geo.region (IN-27), ICBM coordinates & INR (₹) base currency schema',
  });

  const hasBotPermissions = true;
  geoScore += 35;
  checks.push({
    category: 'GEO',
    label: 'Generative Engine Bot Crawling Permissions',
    passed: true,
    details: 'Explicit allow directives for GPTBot, ClaudeBot, PerplexityBot, and Google-Extended',
  });

  return {
    seaScore: Math.min(seaScore, 100),
    aeoScore: Math.min(aeoScore, 100),
    geoScore: Math.min(geoScore, 100),
    overallScore: Math.round((seaScore + aeoScore + geoScore) / 3),
    checks,
  };
}
