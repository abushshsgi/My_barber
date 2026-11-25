import type { SeoLocale } from "./constants";

export type SeoBrand = "mysaloon" | "morf-ai";

export type SeoFaqItem = { question: string; answer: string };

export type SeoPageCopy = {
  title: string;
  description: string;
  h1: string;
  keywords?: string;
  intro: string;
  bullets?: string[];
  faq?: SeoFaqItem[];
  ctaLabel: string;
  ctaHref: string;
  secondaryCta?: { label: string; href: string };
};

export type SeoResolvedPage = {
  pageId: string;
  brand: SeoBrand;
  locale: SeoLocale;
  path: string;
  indexable: boolean;
  sitemap: boolean;
  copy?: SeoPageCopy;
  hreflangCluster?: string;
};