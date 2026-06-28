import { FOOTER_CONTACT, FOOTER_SOCIAL } from "@/lib/footer-links";

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "mysaloon.uz",
  url: "https://mysaloon.uz",
  description: "Salon va sartarosh bron platformasi",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: FOOTER_CONTACT.phone,
    contactType: "customer service",
    availableLanguage: ["Uzbek", "Russian", "English"],
  },
  sameAs: [FOOTER_SOCIAL.telegram, FOOTER_SOCIAL.instagram],
};

export function SiteFooterSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }}
    />
  );
}
