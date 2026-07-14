export type FooterLink = {
  to: string;
  labelKey: string;
  defaultValue: string;
  external?: boolean;
};

export type FooterSection = {
  id: string;
  titleKey: string;
  titleDefault: string;
  links: FooterLink[];
};

export const FOOTER_SOCIAL = {
  telegram: "https://t.me/mysaloonuz",
  instagram: "https://instagram.com/mysaloon.uz",
} as const;

export const FOOTER_CONTACT = {
  phone: "+998 71 200 12 34",
  phoneHref: "tel:+998712001234",
} as const;

export const FOOTER_PAYMENT_METHODS = ["Payme", "Click", "Uzcard"] as const;

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    id: "discovery",
    titleKey: "nav.discovery",
    titleDefault: "Kashf etish",
    links: [
      { to: "/explore", labelKey: "home.quick.trends", defaultValue: "Trend uslublar" },
      { to: "/map", labelKey: "nav.map", defaultValue: "Xarita" },
      { to: "/today", labelKey: "home.quick.today", defaultValue: "Bugungi vaqtlar" },
      { to: "/offers", labelKey: "home.quick.offers", defaultValue: "Aksiyalar" },
      { to: "/compare", labelKey: "home.quick.compare", defaultValue: "Taqqoslash" },
      { to: "/ai-style", labelKey: "home.quick.aiStyle", defaultValue: "Morf AI" },
      { to: "/top", labelKey: "home.quick.stylists", defaultValue: "Top ustalar" },
    ],
  },
  {
    id: "account",
    titleKey: "nav.account",
    titleDefault: "Hisob",
    links: [
      { to: "/profile", labelKey: "nav.profile", defaultValue: "Profil" },
      { to: "/bookings", labelKey: "nav.bookings", defaultValue: "Buyurtmalar" },
      { to: "/wallet", labelKey: "nav.wallet", defaultValue: "Hamyon" },
      { to: "/favorites", labelKey: "profile.favorites", defaultValue: "Sevimlilar" },
      { to: "/notifications", labelKey: "nav.notifications", defaultValue: "Bildirishnomalar" },
      { to: "/chat", labelKey: "nav.chat", defaultValue: "Chat" },
      { to: "/addresses", labelKey: "profile.addresses", defaultValue: "Manzillar" },
      { to: "/referrals", labelKey: "referral.title", defaultValue: "Referrals" },
      { to: "/reviews", labelKey: "profile.reviews", defaultValue: "Sharhlar" },
    ],
  },
  {
    id: "contact",
    titleKey: "footer.contact",
    titleDefault: "Biz bilan bog'lanish",
    links: [{ to: "/support", labelKey: "profile.support", defaultValue: "Yordam markazi" }],
  },
  {
    id: "business",
    titleKey: "footer.business",
    titleDefault: "Salon egalari uchun",
    links: [
      { to: "/support", labelKey: "footer.joinSalon", defaultValue: "Saloningizni qo'shing" },
      { to: "/support", labelKey: "footer.partnership", defaultValue: "Hamkorlik" },
    ],
  },
  {
    id: "legal",
    titleKey: "footer.legal",
    titleDefault: "Huquqiy",
    links: [
      { to: "/privacy", labelKey: "profile.privacy", defaultValue: "Maxfiylik" },
      { to: "/privacy", labelKey: "footer.terms", defaultValue: "Foydalanish shartlari" },
      { to: "/settings", labelKey: "profile.settings", defaultValue: "Sozlamalar" },
    ],
  },
];
