import type { Locale } from "./locale";

export type BarberAuthStrings = {
  title: string;
  subtitle: string;
  langHint: string;
  loginTitle: string;
  signupTitle: string;
  step: string;
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
  continue: string;
  submitting: string;
  userLoginLink: string;
  geoIntro: string;
  geoBtn: string;
  geoLoading: string;
  geoSaved: string;
  geoLatPh: string;
  geoLngPh: string;
  geoManualHint: string;
  salonQuestion: string;
  salonExplain: string;
  yes: string;
  no: string;
  reviewTitle: string;
  reviewName: string;
  reviewEmail: string;
  reviewRegion: string;
  reviewLoc: string;
  reviewSalon: string;
  reviewSalonYes: string;
  reviewSalonNo: string;
  errGeoNoBrowser: string;
  errGeoFailed: string;
  errStep1: string;
  errRegion: string;
  errStep2: string;
  errLatLng: string;
  errSalonChoice: string;
  errSubmitRegion: string;
  errSubmitSalon: string;
  errSubmitLoc: string;
  errLoginFail: string;
  errSignupFail: string;
};

const uz: BarberAuthStrings = {
  title: "MyBarber",
  subtitle: "Sartaroshlar uchun",
  langHint: "Til",
  loginTitle: "Kirish",
  signupTitle: "Ro'yxatdan o'tish",
  step: "Qadam",
  emailPh: "Email",
  passwordPh: "Parol",
  namePh: "To‘liq ism",
  phonePh: "Telefon (ixtiyoriy)",
  passwordMinPh: "Parol (kamida 8 belgi)",
  regionLabel: "Viloyat",
  regionPlaceholder: "Viloyatni tanlang",
  signIn: "Kirish",
  signUp: "Ro'yxatdan o'tish",
  noAccount: "Akkaunt yo'qmi?",
  haveAccount: "Akkaunt bormi?",
  continue: "Davom etish",
  submitting: "Jo‘natilmoqda...",
  userLoginLink: "Mijoz sifatida kirish",
  geoIntro: "Tasdiqlash va keyingi qadamlar uchun joylashuv majburiy.",
  geoBtn: "Joylashuvni olish (GPS)",
  geoLoading: "Olinmoqda...",
  geoSaved: "Joylashuv saqlandi.",
  geoLatPh: "latitude",
  geoLngPh: "longitude",
  geoManualHint: "GPS ishlamasa, xaritadan nuqtani qo‘lda kiriting.",
  salonQuestion: "Saloningiz bormi?",
  salonExplain:
    "Ha — mavjud salonga qo‘shilasiz (joylashuv tekshiriladi). Yo‘q — o‘zingiz salon yaratasiz.",
  yes: "Ha",
  no: "Yo‘q",
  reviewTitle: "Ma'lumotlarni tekshiring",
  reviewName: "Ism",
  reviewEmail: "Email",
  reviewRegion: "Viloyat",
  reviewLoc: "Joylashuv",
  reviewSalon: "Salon",
  reviewSalonYes: "Keyin salon yo‘li sahifasi (mavjud salonga qo‘shilish va boshqalar)",
  reviewSalonNo: "Yangi salon yaratish sahifasi",
  errGeoNoBrowser: "Brauzer joylashuvni qo‘llab-quvvatlamaydi. Quyida lat/lng qo‘lda kiriting.",
  errGeoFailed: "Joylashuv olinmadi. Ruxsat bering yoki quyidagi maydonlarga lat/lng kiriting.",
  errStep1: "Ism, email va kamida 8 belgili parol kiriting.",
  errRegion: "O'zbekiston viloyatini tanlang.",
  errStep2: "Joylashuvni oling yoki lat/lng kiriting.",
  errLatLng: "latitude / longitude noto‘g‘ri.",
  errSalonChoice: "«Saloningiz bormi?» savoliga javob bering.",
  errSubmitRegion: "Viloyatni tanlang.",
  errSubmitSalon: "Salon tanlovi yo‘q.",
  errSubmitLoc: "Joylashuv kerak.",
  errLoginFail: "Kirish muvaffaqiyatsiz",
  errSignupFail: "Ro'yxatdan o'tishda xato",
};

const ru: BarberAuthStrings = {
  title: "MyBarber",
  subtitle: "Для барберов",
  langHint: "Язык",
  loginTitle: "Вход",
  signupTitle: "Регистрация",
  step: "Шаг",
  emailPh: "Email",
  passwordPh: "Пароль",
  namePh: "Полное имя",
  phonePh: "Телефон (необязательно)",
  passwordMinPh: "Пароль (мин. 8 символов)",
  regionLabel: "Область",
  regionPlaceholder: "Выберите область",
  signIn: "Войти",
  signUp: "Регистрация",
  noAccount: "Нет аккаунта?",
  haveAccount: "Уже есть аккаунт?",
  continue: "Далее",
  submitting: "Отправка...",
  userLoginLink: "Вход как клиент",
  geoIntro: "Для подтверждения и следующих шагов нужна геолокация.",
  geoBtn: "Получить геолокацию (GPS)",
  geoLoading: "Получение...",
  geoSaved: "Местоположение сохранено.",
  geoLatPh: "широта",
  geoLngPh: "долгота",
  geoManualHint: "Если GPS не работает, введите координаты вручную.",
  salonQuestion: "У вас уже есть салон?",
  salonExplain:
    "Да — присоединитесь к существующему (проверка по месту). Нет — создадите свой.",
  yes: "Да",
  no: "Нет",
  reviewTitle: "Проверьте данные",
  reviewName: "Имя",
  reviewEmail: "Email",
  reviewRegion: "Область",
  reviewLoc: "Местоположение",
  reviewSalon: "Салон",
  reviewSalonYes: "Далее — поиск салона и присоединение",
  reviewSalonNo: "Далее — создание нового салона",
  errGeoNoBrowser: "Браузер не поддерживает геолокацию. Введите lat/lng ниже.",
  errGeoFailed: "Не удалось получить местоположение. Разрешите доступ или введите lat/lng.",
  errStep1: "Введите имя, email и пароль не короче 8 символов.",
  errRegion: "Выберите область Узбекистана.",
  errStep2: "Получите геолокацию или введите lat/lng.",
  errLatLng: "Некорректные широта / долгота.",
  errSalonChoice: "Ответьте на вопрос «Есть ли салон?».",
  errSubmitRegion: "Выберите область.",
  errSubmitSalon: "Не выбран вариант по салону.",
  errSubmitLoc: "Нужно местоположение.",
  errLoginFail: "Не удалось войти",
  errSignupFail: "Ошибка регистрации",
};

const en: BarberAuthStrings = {
  title: "MyBarber",
  subtitle: "For barbers",
  langHint: "Language",
  loginTitle: "Sign in",
  signupTitle: "Sign up",
  step: "Step",
  emailPh: "Email",
  passwordPh: "Password",
  namePh: "Full name",
  phonePh: "Phone (optional)",
  passwordMinPh: "Password (min 8 characters)",
  regionLabel: "Region",
  regionPlaceholder: "Select region",
  signIn: "Sign in",
  signUp: "Sign up",
  noAccount: "No account?",
  haveAccount: "Already have an account?",
  continue: "Continue",
  submitting: "Submitting...",
  userLoginLink: "Sign in as customer",
  geoIntro: "Location is required for verification and next steps.",
  geoBtn: "Get location (GPS)",
  geoLoading: "Getting location...",
  geoSaved: "Location saved.",
  geoLatPh: "latitude",
  geoLngPh: "longitude",
  geoManualHint: "If GPS fails, enter coordinates manually.",
  salonQuestion: "Do you already have a salon?",
  salonExplain:
    "Yes — you’ll join an existing one (location checked). No — you’ll create your own.",
  yes: "Yes",
  no: "No",
  reviewTitle: "Review your details",
  reviewName: "Name",
  reviewEmail: "Email",
  reviewRegion: "Region",
  reviewLoc: "Location",
  reviewSalon: "Salon",
  reviewSalonYes: "Next: salon discovery & joining",
  reviewSalonNo: "Next: create a new salon",
  errGeoNoBrowser: "Browser has no geolocation. Enter lat/lng below.",
  errGeoFailed: "Could not get location. Allow access or enter lat/lng.",
  errStep1: "Enter name, email and password (min 8 characters).",
  errRegion: "Select a region of Uzbekistan.",
  errStep2: "Get location or enter lat/lng.",
  errLatLng: "Invalid latitude / longitude.",
  errSalonChoice: "Answer “Do you have a salon?”.",
  errSubmitRegion: "Select a region.",
  errSubmitSalon: "Salon option not selected.",
  errSubmitLoc: "Location is required.",
  errLoginFail: "Sign in failed",
  errSignupFail: "Sign up failed",
};

export const barberAuthMessages: Record<Locale, BarberAuthStrings> = {
  uz,
  ru,
  en,
};
