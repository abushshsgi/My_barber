import type { Locale } from "./locale";

export type UserAuthStrings = {
  title: string;
  subtitle: string;
  authPanelLead: string;
  authFeature1: string;
  authFeature2: string;
  authFeature3: string;
  langHint: string;
  loginTitle: string;
  signupTitle: string;
  emailPh: string;
  passwordPh: string;
  namePh: string;
  phonePh: string;
  passwordMinPh: string;
  signIn: string;
  signUp: string;
  noAccount: string;
  haveAccount: string;
  create: string;
  barberLoginLink: string;
  errSignupFields: string;
  errLoginFail: string;
  errSignupFail: string;
  errSignupLoginFail: string;
};

const uz: UserAuthStrings = {
  title: "MyBarber",
  subtitle: "Mijozlar uchun",
  authPanelLead: "Bandlar, salonlar va bildirishnomalar — bitta akkauntda.",
  authFeature1: "Salon va sartaroshlarni xaritadan toping",
  authFeature2: "Bandlarni bir necha bosishda qiling",
  authFeature3: "Profil va tarix har doim yoningizda",
  langHint: "Til",
  loginTitle: "Kirish",
  signupTitle: "Ro'yxatdan o'tish",
  emailPh: "Email",
  passwordPh: "Parol",
  namePh: "Ism",
  phonePh: "Telefon (ixtiyoriy)",
  passwordMinPh: "Parol (min 8)",
  signIn: "Kirish",
  signUp: "Ro'yxatdan o'tish",
  noAccount: "Akkaunt yo'qmi?",
  haveAccount: "Akkaunt bormi?",
  create: "Yaratish",
  barberLoginLink: "Sartarosh sifatida kirish",
  errSignupFields: "Ism, email va kamida 8 belgili parol kiriting.",
  errLoginFail: "Kirish muvaffaqiyatsiz",
  errSignupFail: "Ro'yxatdan o'tishda xato",
  errSignupLoginFail: "Ro'yxatdan o'tildi. Kirishda xato.",
};

const ru: UserAuthStrings = {
  title: "MyBarber",
  subtitle: "Для клиентов",
  authPanelLead: "Записи, салоны и уведомления — в одном аккаунте.",
  authFeature1: "Салоны и мастера на карте",
  authFeature2: "Запись в несколько кликов",
  authFeature3: "Профиль и история всегда под рукой",
  langHint: "Язык",
  loginTitle: "Вход",
  signupTitle: "Регистрация",
  emailPh: "Email",
  passwordPh: "Пароль",
  namePh: "Имя",
  phonePh: "Телефон (необязательно)",
  passwordMinPh: "Пароль (мин. 8)",
  signIn: "Войти",
  signUp: "Регистрация",
  noAccount: "Нет аккаунта?",
  haveAccount: "Уже есть аккаунт?",
  create: "Создать",
  barberLoginLink: "Вход как барбер",
  errSignupFields: "Укажите имя, email и пароль не короче 8 символов.",
  errLoginFail: "Не удалось войти",
  errSignupFail: "Ошибка регистрации",
  errSignupLoginFail: "Регистрация прошла, но вход не удался.",
};

const en: UserAuthStrings = {
  title: "MyBarber",
  subtitle: "For customers",
  authPanelLead: "Bookings, salons, and notifications — one account.",
  authFeature1: "Find salons and barbers on the map",
  authFeature2: "Book in just a few taps",
  authFeature3: "Your profile and history, always with you",
  langHint: "Language",
  loginTitle: "Sign in",
  signupTitle: "Sign up",
  emailPh: "Email",
  passwordPh: "Password",
  namePh: "Full name",
  phonePh: "Phone (optional)",
  passwordMinPh: "Password (min 8)",
  signIn: "Sign in",
  signUp: "Sign up",
  noAccount: "No account?",
  haveAccount: "Already have an account?",
  create: "Create",
  barberLoginLink: "Sign in as barber",
  errSignupFields: "Enter your name, email, and a password of at least 8 characters.",
  errLoginFail: "Sign in failed",
  errSignupFail: "Sign up failed",
  errSignupLoginFail: "Signed up but sign-in failed.",
};

export const userAuthMessages: Record<Locale, UserAuthStrings> = {
  uz,
  ru,
  en,
};
