import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { getTermsOfUse } from "@/content/terms-of-use";
import { parseSubpageBackTo } from "@/lib/subpage-back";

export const Route = createFileRoute("/terms-of-use")({
  validateSearch: (search: Record<string, unknown>): { backTo?: string } => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Terms of Use — mysaloon.uz" },
      {
        name: "description",
        content:
          "MySaloon and Morf AI terms of use: user responsibilities, AI features, bookings, and applicable law.",
      },
    ],
  }),
  component: TermsOfUsePage,
});

function TermsOfUsePage() {
  const { i18n } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam }, "/");
  const doc = getTermsOfUse(i18n.language);

  return (
    <ProfileSubpageLayout title={doc.title} subtitle={doc.updated} backTo={backTo}>
      <article className="prose prose-sm max-w-none text-foreground">
        <p className="leading-relaxed text-muted-foreground">{doc.intro}</p>
        {doc.sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="text-lg font-bold tracking-tight text-foreground">{section.title}</h2>
            {section.body ? (
              <p className="mt-3 leading-relaxed text-muted-foreground">{section.body}</p>
            ) : null}
            {section.bullets ? (
              <ul className="mt-3 space-y-2 list-disc pl-6">
                {section.bullets.map((item) => (
                  <li key={item} className="leading-relaxed text-foreground/85">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
        <p className="mt-8 leading-relaxed">
          <a
            href={`mailto:${doc.contactEmail}`}
            className="font-semibold text-foreground underline decoration-foreground/30 underline-offset-2"
          >
            {doc.contactEmail}
          </a>
        </p>
      </article>
    </ProfileSubpageLayout>
  );
}
