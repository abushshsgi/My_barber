import { FOOTER_CONTACT, FOOTER_SOCIAL } from "@/lib/footer-links";
import { ORG_LOGO, ORG_NAME, SITE_ORIGIN } from "./constants";
import type { SeoFaqItem, SeoPageCopy } from "./types";
import { absoluteUrl } from "./url";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: SITE_ORIGIN,
    logo: ORG_LOGO,
    description: "Salon va sartarosh bron platformasi",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: FOOTER_CONTACT.phone,
      contactType: "customer service",
      availableLanguage: ["Uzbek", "Russian", "English"],
    },
    sameAs: [FOOTER_SOCIAL.telegram, FOOTER_SOCIAL.instagram].filter(Boolean),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME,
    url: SITE_ORIGIN,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_ORIGIN}/map?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function serviceJsonLd(opts: { name: string; description: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    provider: {
      "@type": "Organization",
      name: ORG_NAME,
      url: SITE_ORIGIN,
    },
    areaServed: {
      "@type": "Country",
      name: "Uzbekistan",
    },
  };
}

export function softwareApplicationJsonLd(opts: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "UZS",
    },
    provider: {
      "@type": "Organization",
      name: ORG_NAME,
      url: SITE_ORIGIN,
    },
  };
}

export function hairSalonJsonLd(opts: {
  name: string;
  url: string;
  description?: string;
  address?: string;
  image?: string | null;
  rating?: number;
  ratingCount?: number;
}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: opts.name,
    url: opts.url,
    "@id": opts.url,
  };
  if (opts.description) node.description = opts.description;
  if (opts.image) node.image = opts.image;
  if (opts.address) {
    node.address = {
      "@type": "PostalAddress",
      streetAddress: opts.address,
      addressCountry: "UZ",
    };
  }
  if (opts.rating && opts.rating > 0 && opts.ratingCount && opts.ratingCount > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(opts.rating),
      reviewCount: opts.ratingCount,
    };
  }
  return node;
}

export function faqPageJsonLd(items: SeoFaqItem[]) {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbJsonLd(crumbs: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function imageObjectJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  contentUrl: string;
  width?: number;
  height?: number;
  caption?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    contentUrl: opts.contentUrl,
    ...(opts.width ? { width: opts.width } : {}),
    ...(opts.height ? { height: opts.height } : {}),
    ...(opts.caption ? { caption: opts.caption } : {}),
  };
}

export function landingJsonLdBlocks(copy: SeoPageCopy, canonical: string, serviceName: string) {
  const blocks: unknown[] = [
    organizationJsonLd(),
    websiteJsonLd(),
    serviceJsonLd({ name: serviceName, description: copy.description, url: canonical }),
  ];
  const faq = faqPageJsonLd(copy.faq ?? []);
  if (faq) blocks.push(faq);
  return blocks;
}
