import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ProfileSubpageCard,
  ProfileSubpageLayout,
} from "@/components/profile/ProfileSubpageLayout";
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
      <div className="space-y-4">
        <ProfileSubpageCard>
          <p className="text-sm leading-relaxed text-muted-foreground">{doc.intro}</p>
        </ProfileSubpageCard>
        {doc.sections.map((section) => (
          <ProfileSubpageCard key={section.title}>
            <h2 className="text-base font-bold tracking-tight">{section.title}</h2>
            {section.body ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            ) : null}
            {section.bullets ? (
              <ul className="mt-3 space-y-2">
                {section.bullets.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-foreground/85">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </ProfileSubpageCard>
        ))}
        <ProfileSubpageCard>
          <a
            href={`mailto:${doc.contactEmail}`}
            className="text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-2"
          >
            {doc.contactEmail}
          </a>
        </ProfileSubpageCard>
      </div>
    </ProfileSubpageLayout>
  );
}
