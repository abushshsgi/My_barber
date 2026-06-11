export type AgeGroup = "kids" | "teen" | "young" | "adult" | "mature";

export const AGE_GROUP_LABELS_UZ: Record<AgeGroup, string> = {
  kids: "Bolalar (10–12)",
  teen: "O'smirlar (13–17)",
  young: "Yosh (18–29)",
  adult: "30+",
  mature: "Katta yosh (45+)",
};

export function birthYearToAge(birthYear: number | null | undefined): number | null {
  if (birthYear == null) return null;
  const age = new Date().getFullYear() - birthYear;
  if (age < 10 || age > 120) return null;
  return age;
}

export function ageToGroup(age: number | null | undefined): AgeGroup | null {
  if (age == null) return null;
  if (age <= 12) return "kids";
  if (age <= 17) return "teen";
  if (age <= 29) return "young";
  if (age <= 44) return "adult";
  return "mature";
}

export function birthYearToAgeGroup(birthYear: number | null | undefined): AgeGroup | null {
  return ageToGroup(birthYearToAge(birthYear));
}
