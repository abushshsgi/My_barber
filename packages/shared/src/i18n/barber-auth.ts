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
  salonStepTitle: string;
  salonStepIntro: string;
  pathOwnerTitle: string;
  pathOwnerDesc: string;
  pathEmployeeTitle: string;
  pathEmployeeDesc: string;
  pathMybarberTitle: string;
  pathMybarberDesc: string;
  reviewTitle: string;
  reviewName: string;
  reviewEmail: string;
  reviewRegion: string;
  reviewLoc: string;
  reviewRole: string;
  reviewPathOwner: string;
  reviewPathEmployee: string;
  reviewPathMybarber: string;
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
  salonStepTitle: "Salon egasimisiz yoki salonda ishlaysizmi?",
  salonStepIntro:
    "Keyingi qadam siz tanlagan yo‘lga bog‘liq: salon yaratish, mavjud salonga qo‘shilish yoki MyBarber orqali yangi salon.",
  pathOwnerTitle: "Men salon egasiman",
  pathOwnerDesc: "O‘z saloningizni yaratasiz: nom, manzil, joylashuv va xizmatlar.",
  pathEmployeeTitle: "Men salonda ishlayman",
  pathEmployeeDesc:
    "Tizimdagi salondan birini topasiz; qo‘shilishda joylashuvingiz salon manzili bilan mos kelishi tekshiriladi.",
  pathMybarberTitle: "MyBarber bilan yangi salon",
  pathMybarberDesc:
    "Haqiqiy salon bo‘lmasa ham, MyBarber brendi ostida onlayn salon ochishingiz mumkin (nom avtomatik taklif qilinadi).",
  reviewTitle: "Ma'lumotlarni tekshiring",
  reviewName: "Ism",
  reviewEmail: "Email",
  reviewRegion: "Viloyat",
  reviewLoc: "Joylashuv",
  reviewRole: "Salon bo‘yicha",
  reviewPathOwner: "Salon egasi — keyin o‘z saloningizni yaratish",
  reviewPathEmployee: "Salonda ishchi — keyin salonga qo‘shilish (joylashuv tekshiruvi)",
  reviewPathMybarber: "MyBarber salon — keyin tez yaratish sahifasi",
  errGeoNoBrowser: "Brauzer joylashuvni qo‘llab-quvvatlamaydi. Quyida lat/lng qo‘lda kiriting.",
  errGeoFailed: "Joylashuv olinmadi. Ruxsat bering yoki quyidagi maydonlarga lat/lng kiriting.",
  errStep1: "Ism, email va kamida 8 belgili parol kiriting.",
  errRegion: "O'zbekiston viloyatini tanlang.",
  errStep2: "Joylashuvni oling yoki lat/lng kiriting.",
  errLatLng: "latitude / longitude noto‘g‘ri.",
  errSalonChoice: "Salon egasi / ishchi / MyBarber yo‘lidan birini tanlang.",
  errSubmitRegion: "Viloyatni tanlang.",
  errSubmitSalon: "Salon bo‘yicha variant tanlanmagan.",
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
  salonStepTitle: "Вы владелец салона или работаете в салоне?",
  salonStepIntro:
    "Дальнейшие шаги зависят от выбора: создать салон, присоединиться к существующему или открыть салон через MyBarber.",
  pathOwnerTitle: "Я владелец салона",
  pathOwnerDesc: "Вы создаёте свой салон: название, адрес, геолокация и услуги.",
  pathEmployeeTitle: "Я работаю в салоне",
  pathEmployeeDesc:
    "Найдёте салон в системе; при присоединении проверяется, что вы рядом с адресом салона.",
  pathMybarberTitle: "Новый салон с MyBarber",
  pathMybarberDesc:
    "Даже без своего помещения можно открыть онлайн-салон под брендом MyBarber (название подставится автоматически).",
  reviewTitle: "Проверьте данные",
  reviewName: "Имя",
  reviewEmail: "Email",
  reviewRegion: "Область",
  reviewLoc: "Местоположение",
  reviewRole: "По салону",
  reviewPathOwner: "Владелец — далее создание своего салона",
  reviewPathEmployee: "Сотрудник — далее присоединение (проверка геолокации)",
  reviewPathMybarber: "Салон MyBarber — далее быстрое создание",
  errGeoNoBrowser: "Браузер не поддерживает геолокацию. Введите lat/lng ниже.",
  errGeoFailed: "Не удалось получить местоположение. Разрешите доступ или введите lat/lng.",
  errStep1: "Введите имя, email и пароль не короче 8 символов.",
  errRegion: "Выберите область Узбекистана.",
  errStep2: "Получите геолокацию или введите lat/lng.",
  errLatLng: "Некорректные широта / долгота.",
  errSalonChoice: "Выберите один из вариантов: владелец, сотрудник или MyBarber.",
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
  salonStepTitle: "Are you a salon owner or do you work at a salon?",
  salonStepIntro:
    "Next steps depend on your choice: create a salon, join an existing one, or open a MyBarber-branded salon.",
  pathOwnerTitle: "I’m a salon owner",
  pathOwnerDesc: "You’ll create your salon: name, address, location on the map, and services.",
  pathEmployeeTitle: "I work at a salon",
  pathEmployeeDesc:
    "You’ll find your salon in the app; when joining, your location must match the salon address.",
  pathMybarberTitle: "New salon with MyBarber",
  pathMybarberDesc:
    "Even without a physical shop you can open an online salon under the MyBarber brand (name suggested automatically).",
  reviewTitle: "Review your details",
  reviewName: "Name",
  reviewEmail: "Email",
  reviewRegion: "Region",
  reviewLoc: "Location",
  reviewRole: "Salon path",
  reviewPathOwner: "Owner — next: create your salon",
  reviewPathEmployee: "Employee — next: join a salon (location check)",
  reviewPathMybarber: "MyBarber salon — next: quick setup",
  errGeoNoBrowser: "Browser has no geolocation. Enter lat/lng below.",
  errGeoFailed: "Could not get location. Allow access or enter lat/lng.",
  errStep1: "Enter name, email and password (min 8 characters).",
  errRegion: "Select a region of Uzbekistan.",
  errStep2: "Get location or enter lat/lng.",
  errLatLng: "Invalid latitude / longitude.",
  errSalonChoice: "Pick owner, employee, or MyBarber path.",
  errSubmitRegion: "Select a region.",
  errSubmitSalon: "Salon path not selected.",
  errSubmitLoc: "Location is required.",
  errLoginFail: "Sign in failed",
  errSignupFail: "Sign up failed",
};

export const barberAuthMessages: Record<Locale, BarberAuthStrings> = {
  uz,
  ru,
  en,
};

export type BarberSignupPath = "owner" | "employee" | "mybarber";
