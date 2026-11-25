import { buildSalonHeadMeta, fetchSalonSeoMeta } from "@/lib/salon-seo.server";
import {
  buildMorphLookHeadMeta,
  buildMorphShareHeadMeta,
  fetchMorphLookSeo,
  fetchMorphShareSeo,
} from "@/lib/morph-share-seo.server";
import { buildDynamicHead, buildHeadForPathname, type BuiltHead } from "@/seo/build-head";
import { SITE_ORIGIN } from "@/seo/constants";
import {
  breadcrumbJsonLd,
  hairSalonJsonLd,
  landingJsonLdBlocks,
  softwareApplicationJsonLd,
} from "@/seo/json-ld";
import { resolveRegistryPage } from "@/seo/registry";
import {
  buildPrerenderInner,
  headToHtmlTags,
  injectBeforeHeadClose,
  injectSeoPrerenderMain,
  jsonLdScripts,
  stripReplaceableSeoTags,
} from "@/seo/html-utils";
import { isNoindexPath } from "@/seo/noindex";
import { getCanonicalUrl } from "@/seo/url";

function toBuiltHead(raw: { meta: Array<Record<string, string>>; links?: Array<{ rel: string; href: string }> }): BuiltHead {
  return {
    meta: raw.meta as BuiltHead["meta"],
    links: (raw.links ?? []).map((l) => ({ ...l })),
  };
}

async function headForPath(pathname: string): Promise<{ head: BuiltHead; jsonLd: unknown[]; prerender?: string } | null> {
  const registryHead = buildHeadForPathname(pathname);
  if (registryHead) {
    const resolved = resolveRegistryPage(pathname);
    if (!resolved?.copy) return null;
    const canonical = getCanonicalUrl(pathname);
    const serviceName = resolved.brand === "morf-ai" ? "Morf AI" : "MySaloon";
    const jsonLd =
      resolved.brand === "morf-ai"
        ? [
            ...landingJsonLdBlocks(resolved.copy, canonical, serviceName),
            softwareApplicationJsonLd({
              name: "Morf AI",
              description: resolved.copy.description,
              url: canonical,
            }),
            breadcrumbJsonLd([
              { name: "MySaloon", path: "/" },
              { name: "Morf AI", path: "/morf-ai" },
              { name: resolved.copy.h1, path: resolved.path },
            ]),
          ]
        : landingJsonLdBlocks(resolved.copy, canonical, serviceName);

    const prerender = buildPrerenderInner(resolved.copy.h1, resolved.copy.intro || resolved.copy.description, [
      { href: resolved.copy.ctaHref, text: resolved.copy.ctaLabel },
      ...(resolved.copy.secondaryCta
        ? [{ href: resolved.copy.secondaryCta.href, text: resolved.copy.secondaryCta.label }]
        : []),
    ]);
    return { head: registryHead, jsonLd, prerender };
  }

  const salonMatch = pathname.match(/^\/salon\/([^/]+)\/?$/);
  if (salonMatch) {
    const salonId = salonMatch[1]!;
    const seo = await fetchSalonSeoMeta(salonId);
    const built = toBuiltHead(buildSalonHeadMeta(salonId, seo));
    const canonical = `${SITE_ORIGIN}/salon/${encodeURIComponent(salonId)}`;
    const jsonLd = seo
      ? [
          hairSalonJsonLd({
            name: seo.name,
            url: canonical,
            description: seo.about,
            address: seo.address,
            image: seo.image,
            rating: undefined,
          }),
        ]
      : [];
    const prerender = buildPrerenderInner(
      seo?.name ?? "Salon",
      seo?.about ?? "Salon profili — mysaloon.uz",
      [{ href: `/booking/${encodeURIComponent(salonId)}`, text: "Bron qilish" }],
    );
    return { head: built, jsonLd, prerender };
  }

  const shareMatch = pathname.match(/^\/morf-ai\/share\/([^/]+)\/?$/);
  if (shareMatch) {
    const shareId = decodeURIComponent(shareMatch[1]!);
    const seo = await fetchMorphShareSeo(shareId);
    const built = toBuiltHead(buildMorphShareHeadMeta(shareId, seo));
    const prerender = buildPrerenderInner(
      seo?.title ?? "Morf AI natija",
      seo?.description ?? "",
      [{ href: "/ai-style", text: "O'zimda sinab ko'rish" }],
    );
    return { head: built, jsonLd: [], prerender };
  }

  const lookMatch = pathname.match(/^\/morf-ai\/look\/([^/]+)\/?$/);
  if (lookMatch) {
    const styleId = decodeURIComponent(lookMatch[1]!);
    const seo = await fetchMorphLookSeo(styleId);
    const built = toBuiltHead(buildMorphLookHeadMeta(styleId, seo));
    const prerender = buildPrerenderInner(
      seo?.styleTitle ?? "Morf AI uslub",
      seo?.description ?? "",
      [{ href: `/explore/${encodeURIComponent(styleId)}/try`, text: "Try-on" }],
    );
    return { head: built, jsonLd: [], prerender };
  }

  const exploreMatch = pathname.match(/^\/explore\/([^/]+)\/?$/);
  if (exploreMatch) {
    const styleId = decodeURIComponent(exploreMatch[1]!);
    const seo = await fetchMorphLookSeo(styleId);
    const title = seo?.title ?? `${styleId} — soch uslubi`;
    const description = seo?.description ?? "Soch uslubini Morf AI da sinab ko'ring.";
    const canonical = `${SITE_ORIGIN}/explore/${encodeURIComponent(styleId)}`;
    const head = buildDynamicHead({ title, description, canonical, image: seo?.image });
    const prerender = buildPrerenderInner(seo?.styleTitle ?? styleId, description, [
      { href: `/explore/${encodeURIComponent(styleId)}/try`, text: "Try-on" },
    ]);
    return { head, jsonLd: [], prerender };
  }

  if (isNoindexPath(pathname)) {
    const head = buildDynamicHead({
      title: "mysaloon.uz",
      description: "MySaloon",
      canonical: getCanonicalUrl(pathname),
      noindex: true,
    });
    return { head, jsonLd: [] };
  }

  return null;
}

export async function injectSeoIntoHtml(response: Response, pathname: string): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const pack = await headForPath(pathname);
  if (!pack) return response;

  let html = stripReplaceableSeoTags(await response.text());
  const tags = [headToHtmlTags(pack.head), jsonLdScripts(pack.jsonLd)].filter(Boolean).join("\n    ");
  html = injectBeforeHeadClose(html, tags);
  if (pack.prerender) html = injectSeoPrerenderMain(html, pack.prerender);

  const outHeaders = new Headers(response.headers);
  outHeaders.delete("content-length");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  });
}