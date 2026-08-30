export type CountryDetection = {
  countryName: string;
  prefix: string;
  isMatched: boolean;
};

const EXACT: Record<string, string> = {
  "380": "Bulgaria",
  "383": "Slovenia",
  "385": "Croatia",
  "387": "Bosnia and Herzegovina",
  "389": "Montenegro",
  "470": "Kyrgyzstan",
  "471": "Taiwan",
  "474": "Estonia",
  "475": "Latvia",
  "476": "Azerbaijan",
  "477": "Lithuania",
  "478": "Uzbekistan",
  "479": "Sri Lanka",
  "480": "Philippines",
  "481": "Belarus",
  "482": "Ukraine",
  "483": "Turkmenistan",
  "484": "Moldova",
  "485": "Armenia",
  "486": "Georgia",
  "487": "Kazakhstan",
  "488": "Tajikistan",
  "489": "Hong Kong",
  "528": "Lebanon",
  "529": "Cyprus",
  "530": "Albania",
  "531": "North Macedonia",
  "535": "Malta",
  "539": "Ireland",
  "560": "Portugal",
  "569": "Iceland",
  "590": "Poland",
  "594": "Romania",
  "599": "Hungary",
  "603": "Ghana",
  "604": "Senegal",
  "608": "Bahrain",
  "609": "Mauritius",
  "611": "Morocco",
  "613": "Algeria",
  "615": "Nigeria",
  "616": "Kenya",
  "618": "Ivory Coast",
  "619": "Tunisia",
  "620": "Tanzania",
  "621": "Syria",
  "622": "Egypt",
  "624": "Libya",
  "625": "Jordan",
  "626": "Iran",
  "627": "Kuwait",
  "628": "Saudi Arabia",
  "629": "United Arab Emirates",
  "729": "Israel",
  "740": "Guatemala",
  "741": "El Salvador",
  "742": "Honduras",
  "743": "Nicaragua",
  "744": "Costa Rica",
  "745": "Panama",
  "746": "Dominican Republic",
  "750": "Mexico",
  "759": "Venezuela",
  "773": "Uruguay",
  "775": "Peru",
  "777": "Bolivia",
  "780": "Chile",
  "784": "Paraguay",
  "786": "Ecuador",
  "850": "Cuba",
  "858": "Slovakia",
  "859": "Czech Republic",
  "860": "Serbia",
  "865": "Mongolia",
  "867": "North Korea",
  "880": "South Korea",
  "884": "Cambodia",
  "885": "Thailand",
  "888": "Singapore",
  "890": "India",
  "893": "Vietnam",
  "896": "Pakistan",
  "899": "Indonesia",
  "955": "Malaysia",
  "958": "Macau",
};

const RANGES: Array<{ start: number; end: number; name: string; label: string }> = [
  { start: 0, end: 19, name: "USA/Canada", label: "000-019" },
  { start: 30, end: 39, name: "USA", label: "030-039" },
  { start: 60, end: 139, name: "USA", label: "060-139" },
  { start: 300, end: 379, name: "France", label: "300-379" },
  { start: 400, end: 440, name: "Germany", label: "400-440" },
  { start: 450, end: 459, name: "Japan", label: "450-459" },
  { start: 460, end: 469, name: "Russia", label: "460-469" },
  { start: 490, end: 499, name: "Japan", label: "490-499" },
  { start: 500, end: 509, name: "United Kingdom", label: "500-509" },
  { start: 520, end: 521, name: "Greece", label: "520-521" },
  { start: 540, end: 549, name: "Belgium/Luxembourg", label: "540-549" },
  { start: 570, end: 579, name: "Denmark", label: "570-579" },
  { start: 600, end: 601, name: "South Africa", label: "600-601" },
  { start: 640, end: 649, name: "Finland", label: "640-649" },
  { start: 690, end: 699, name: "China", label: "690-699" },
  { start: 700, end: 709, name: "Norway", label: "700-709" },
  { start: 730, end: 739, name: "Sweden", label: "730-739" },
  { start: 754, end: 755, name: "Canada", label: "754-755" },
  { start: 760, end: 769, name: "Switzerland", label: "760-769" },
  { start: 770, end: 771, name: "Colombia", label: "770-771" },
  { start: 778, end: 779, name: "Argentina", label: "778-779" },
  { start: 789, end: 790, name: "Brazil", label: "789-790" },
  { start: 800, end: 839, name: "Italy", label: "800-839" },
  { start: 840, end: 849, name: "Spain", label: "840-849" },
  { start: 868, end: 869, name: "Turkey", label: "868-869" },
  { start: 870, end: 879, name: "Netherlands", label: "870-879" },
  { start: 900, end: 919, name: "Austria", label: "900-919" },
  { start: 930, end: 939, name: "Australia", label: "930-939" },
  { start: 940, end: 949, name: "New Zealand", label: "940-949" },
];

export function normalizeBarcode(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

export function detectCountryFromBarcode(barcode: string): CountryDetection {
  const digits = normalizeBarcode(barcode);
  if (digits.length < 8) {
    return { countryName: "", prefix: "", isMatched: false };
  }
  const prefix3 = digits.slice(0, 3);
  const n = Number(prefix3);
  if (!Number.isFinite(n)) {
    return { countryName: "", prefix: "", isMatched: false };
  }
  const exact = EXACT[prefix3];
  if (exact) {
    return { countryName: exact, prefix: prefix3, isMatched: true };
  }
  for (const range of RANGES) {
    if (n >= range.start && n <= range.end) {
      return { countryName: range.name, prefix: range.label, isMatched: true };
    }
  }
  return { countryName: "", prefix: prefix3, isMatched: false };
}
