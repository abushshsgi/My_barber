import type { Locale } from "./locale";

export type UserAuthStrings = {
  title: string;
  subtitle: string;
  langHint: string;
  loginTitle: string;
  signupTitle: string;
  emailPh: string;
  passwordPh: string;
  namePh: string;
  phonePh: string;
  passwordMinPh: string;
  regionLabel: string;
  regionPlaceholder: string;
  signIn: string;
  signUp: string;
  noAccount: string;
  haveAccount: string;
  create: string;
  barberLoginLink: string;
  errRegion: string;
  errLoginFail: string;
  errSignupFail: string;
  errSignupLoginFail: string;
};

const uz: UserAuthStrings = {
  title: "MyBarber",
  subtitle: "Mijozlar uchun",
  langHint: "Til",
  loginTitle: "Kirish",
  signupTitle: "Ro'yxatdan o'tish",
  emailPh: "Email",
  passwordPh: "Parol",
  namePh: "Ism",
  phonePh: "Telefon (ixtiyoriy)",
  passwordMinPh: "Parol (min 8)",
  regionLabel: "Viloyat",
  regionPlaceholder: "Viloyatni tanlang",
  signIn: "Kirish",
  signUp: "Ro'yxatdan o'tish",
  noAccount: "Akkaunt yo'qmi?",
  haveAccount: "Akkaunt bormi?",
  create: "Yaratish",
  barberLoginLink: "Sartarosh sifatida kirish",
  errRegion: "Viloyatni tanlang.",
  errLoginFail: "Kirish muvaffaqiyatsiz",
  errSignupFail: "Ro'yxatdan o'tishda xato",
  errSignupLoginFail: "Ro'yxatdan o'tildi. Kirishda xato.",
};

const ru: UserAuthStrings = {
  title: "MyBarber",
  subtitle: "Для клиентов",
  langHint: "Язык",
  loginTitle: "Вход",
  signupTitle: "Регистрация",
  emailPh: "Email",
  passwordPh: "Пароль",
  namePh: "Имя",
  phonePh: "Телефон (необязательно)",
  passwordMinPh: "Пароль (мин. 8)",
  regionLabel: "Область",
  regionPlaceholder: "Выберите область",
  signIn: "Войти",
  signUp: "Регистрация",
  noAccount: "Нет аккаунта?",
  haveAccount: "Уже есть аккаунт?",
  create: "Создать",
  barberLoginLink: "Вход как барбер",
  errRegion: "Выберите область.",
  errLoginFail: "Не удалось войти",
  errSignupFail: "Ошибка регистрации",
  errSignupLoginFail: "Регистрация прошла, но вход не удался.",
};

const en: UserAuthStrings = {
  title: "MyBarber",
  subtitle: "For customers",
  langHint: "Language",
  loginTitle: "Sign in",
  signupTitle: "Sign up",
  emailPh: "Email",
  passwordPh: "Password",
  namePh: "Full name",
  phonePh: "Phone (optional)",
  passwordMinPh: "Password (min 8)",
  regionLabel: "Region",
  regionPlaceholder: "Select region",
  signIn: "Sign in",
  signUp: "Sign up",
  noAccount: "No account?",
  haveAccount: "Already have an account?",
  create: "Create",
  barberLoginLink: "Sign in as barber",
  errRegion: "Please select a region.",
  errLoginFail: "Sign in failed",
  errSignupFail: "Sign up failed",
  errSignupLoginFail: "Signed up but sign-in failed.",
};

export const userAuthMessages: Record<Locale, UserAuthStrings> = {
  uz,
  ru,
  en,
};
