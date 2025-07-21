/**
 * Persona Localization Hook
 * International accessibility and localization support with cultural adaptation
 */

import { useState, useEffect, useCallback } from "react";

export type SupportedLocale =
  | "en-US" // English (United States)
  | "en-GB" // English (United Kingdom)
  | "es-ES" // Spanish (Spain)
  | "es-MX" // Spanish (Mexico)
  | "fr-FR" // French (France)
  | "fr-CA" // French (Canada)
  | "de-DE" // German (Germany)
  | "de-AT" // German (Austria)
  | "ja-JP" // Japanese (Japan)
  | "zh-CN" // Chinese (Simplified)
  | "zh-TW" // Chinese (Traditional)
  | "ko-KR" // Korean (South Korea)
  | "pt-BR" // Portuguese (Brazil)
  | "pt-PT" // Portuguese (Portugal)
  | "it-IT" // Italian (Italy)
  | "ru-RU" // Russian (Russia)
  | "ar-SA" // Arabic (Saudi Arabia)
  | "hi-IN" // Hindi (India)
  | "th-TH" // Thai (Thailand)
  | "vi-VN"; // Vietnamese (Vietnam)

export type TextDirection = "ltr" | "rtl";
export type NumberingSystem = "latn" | "arab" | "hanidec" | "deva";

interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: TextDirection;
  numberingSystem: NumberingSystem;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  decimalSeparator: string;
  thousandsSeparator: string;
  // Cultural preferences
  formalityLevel: "formal" | "informal";
  // Accessibility considerations
  screenReaderSupport: "excellent" | "good" | "basic";
  fontFamily?: string;
}

// interface TranslationKey {
//   key: string;
//   defaultValue: string;
//   context?: string;
//   pluralization?: {
//     zero?: string;
//     one?: string;
//     few?: string;
//     many?: string;
//     other: string;
//   };
// }

interface UseLocalizationReturn {
  // Current locale
  locale: SupportedLocale;
  localeConfig: LocaleConfig;

  // Actions
  setLocale: (locale: SupportedLocale) => void;
  detectLocale: () => SupportedLocale;

  // Translation
  t: (key: string, params?: Record<string, any>, count?: number) => string;
  hasTranslation: (key: string) => boolean;

  // Formatting
  formatDate: (
    date: Date,
    format?: "short" | "medium" | "long" | "full",
  ) => string;
  formatTime: (date: Date, format?: "short" | "medium" | "long") => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatRelativeTime: (date: Date) => string;

  // Utilities
  isRTL: boolean;
  getTextDirection: () => TextDirection;
  getReadingDirection: () => "horizontal" | "vertical";

  // Accessibility
  getLanguageCode: () => string;
  getRegionCode: () => string;
  getAriaLabel: (key: string, params?: Record<string, any>) => string;
}

// Locale configurations
const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  "en-US": {
    code: "en-US",
    name: "English (US)",
    nativeName: "English (United States)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "MM/dd/yyyy",
    timeFormat: "h:mm a",
    currency: "USD",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "informal",
    screenReaderSupport: "excellent",
  },
  "en-GB": {
    code: "en-GB",
    name: "English (UK)",
    nativeName: "English (United Kingdom)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    currency: "GBP",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "formal",
    screenReaderSupport: "excellent",
  },
  "es-ES": {
    code: "es-ES",
    name: "Spanish (Spain)",
    nativeName: "Español (España)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    currency: "EUR",
    decimalSeparator: ",",
    thousandsSeparator: ".",
    formalityLevel: "formal",
    screenReaderSupport: "good",
  },
  "es-MX": {
    code: "es-MX",
    name: "Spanish (Mexico)",
    nativeName: "Español (México)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "h:mm a",
    currency: "MXN",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "formal",
    screenReaderSupport: "good",
  },
  "fr-FR": {
    code: "fr-FR",
    name: "French (France)",
    nativeName: "Français (France)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    currency: "EUR",
    decimalSeparator: ",",
    thousandsSeparator: " ",
    formalityLevel: "formal",
    screenReaderSupport: "good",
  },
  "de-DE": {
    code: "de-DE",
    name: "German (Germany)",
    nativeName: "Deutsch (Deutschland)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd.MM.yyyy",
    timeFormat: "HH:mm",
    currency: "EUR",
    decimalSeparator: ",",
    thousandsSeparator: ".",
    formalityLevel: "formal",
    screenReaderSupport: "good",
  },
  "ja-JP": {
    code: "ja-JP",
    name: "Japanese",
    nativeName: "日本語",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "yyyy/MM/dd",
    timeFormat: "H:mm",
    currency: "JPY",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "formal",
    screenReaderSupport: "good",
    fontFamily: "Hiragino Sans, Yu Gothic, Meiryo, sans-serif",
  },
  "zh-CN": {
    code: "zh-CN",
    name: "Chinese (Simplified)",
    nativeName: "简体中文",
    direction: "ltr",
    numberingSystem: "hanidec",
    dateFormat: "yyyy/MM/dd",
    timeFormat: "H:mm",
    currency: "CNY",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "formal",
    screenReaderSupport: "basic",
    fontFamily: "PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif",
  },
  "zh-TW": {
    code: "zh-TW",
    name: "Chinese (Traditional)",
    nativeName: "繁體中文",
    direction: "ltr",
    numberingSystem: "hanidec",
    dateFormat: "yyyy/MM/dd",
    timeFormat: "H:mm",
    currency: "TWD",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "formal",
    screenReaderSupport: "basic",
    fontFamily:
      "PingFang TC, Hiragino Sans CNS, Microsoft JhengHei, sans-serif",
  },
  "ko-KR": {
    code: "ko-KR",
    name: "Korean",
    nativeName: "한국어",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "yyyy. MM. dd.",
    timeFormat: "a h:mm",
    currency: "KRW",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "formal",
    screenReaderSupport: "good",
    fontFamily: "Apple SD Gothic Neo, Malgun Gothic, sans-serif",
  },
  "ar-SA": {
    code: "ar-SA",
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    numberingSystem: "arab",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "h:mm a",
    currency: "SAR",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "formal",
    screenReaderSupport: "basic",
    fontFamily: "Tahoma, Arial, sans-serif",
  },
  // Add other locales as needed...
  "pt-BR": {
    code: "pt-BR",
    name: "Portuguese (Brazil)",
    nativeName: "Português (Brasil)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    currency: "BRL",
    decimalSeparator: ",",
    thousandsSeparator: ".",
    formalityLevel: "informal",
    screenReaderSupport: "good",
  },
  "pt-PT": {
    code: "pt-PT",
    name: "Portuguese (Portugal)",
    nativeName: "Português (Portugal)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    currency: "EUR",
    decimalSeparator: ",",
    thousandsSeparator: " ",
    formalityLevel: "formal",
    screenReaderSupport: "good",
  },
  "it-IT": {
    code: "it-IT",
    name: "Italian",
    nativeName: "Italiano",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    currency: "EUR",
    decimalSeparator: ",",
    thousandsSeparator: ".",
    formalityLevel: "formal",
    screenReaderSupport: "good",
  },
  "ru-RU": {
    code: "ru-RU",
    name: "Russian",
    nativeName: "Русский",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd.MM.yyyy",
    timeFormat: "HH:mm",
    currency: "RUB",
    decimalSeparator: ",",
    thousandsSeparator: " ",
    formalityLevel: "formal",
    screenReaderSupport: "good",
  },
  "hi-IN": {
    code: "hi-IN",
    name: "Hindi",
    nativeName: "हिन्दी",
    direction: "ltr",
    numberingSystem: "deva",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "h:mm a",
    currency: "INR",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "formal",
    screenReaderSupport: "basic",
    fontFamily: "Devanagari Sangam MN, Noto Sans Devanagari, sans-serif",
  },
  "th-TH": {
    code: "th-TH",
    name: "Thai",
    nativeName: "ไทย",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "H:mm",
    currency: "THB",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    formalityLevel: "formal",
    screenReaderSupport: "basic",
    fontFamily: "Thonburi, Tahoma, sans-serif",
  },
  "vi-VN": {
    code: "vi-VN",
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "H:mm",
    currency: "VND",
    decimalSeparator: ",",
    thousandsSeparator: ".",
    formalityLevel: "formal",
    screenReaderSupport: "basic",
  },
  "fr-CA": {
    code: "fr-CA",
    name: "French (Canada)",
    nativeName: "Français (Canada)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "yyyy-MM-dd",
    timeFormat: "H:mm",
    currency: "CAD",
    decimalSeparator: ",",
    thousandsSeparator: " ",
    formalityLevel: "informal",
    screenReaderSupport: "good",
  },
  "de-AT": {
    code: "de-AT",
    name: "German (Austria)",
    nativeName: "Deutsch (Österreich)",
    direction: "ltr",
    numberingSystem: "latn",
    dateFormat: "dd.MM.yyyy",
    timeFormat: "HH:mm",
    currency: "EUR",
    decimalSeparator: ",",
    thousandsSeparator: ".",
    formalityLevel: "formal",
    screenReaderSupport: "good",
  },
};

// Mock translations - in a real app, these would come from translation files
const TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  "en-US": {
    "wallet.title": "Persona Wallet",
    "wallet.subtitle": "Your secure digital identity",
    "auth.sign_in": "Sign In",
    "auth.sign_out": "Sign Out",
    "auth.biometric_prompt": "Use your biometric to authenticate",
    "errors.network_error": "Network connection error",
    "errors.invalid_credentials": "Invalid credentials",
    "navigation.dashboard": "Dashboard",
    "navigation.credentials": "Credentials",
    "navigation.settings": "Settings",
    // Add more translations...
  },
  "es-ES": {
    "wallet.title": "Billetera Persona",
    "wallet.subtitle": "Su identidad digital segura",
    "auth.sign_in": "Iniciar Sesión",
    "auth.sign_out": "Cerrar Sesión",
    "auth.biometric_prompt": "Use su biometría para autenticarse",
    "errors.network_error": "Error de conexión de red",
    "errors.invalid_credentials": "Credenciales inválidas",
    "navigation.dashboard": "Panel de Control",
    "navigation.credentials": "Credenciales",
    "navigation.settings": "Configuración",
  },
  "fr-FR": {
    "wallet.title": "Portefeuille Persona",
    "wallet.subtitle": "Votre identité numérique sécurisée",
    "auth.sign_in": "Se Connecter",
    "auth.sign_out": "Se Déconnecter",
    "auth.biometric_prompt": "Utilisez votre biométrie pour vous authentifier",
    "errors.network_error": "Erreur de connexion réseau",
    "errors.invalid_credentials": "Identifiants invalides",
    "navigation.dashboard": "Tableau de Bord",
    "navigation.credentials": "Identifiants",
    "navigation.settings": "Paramètres",
  },
  // Add other language translations...
} as any;

export const useLocalization = (): UseLocalizationReturn => {
  const [locale, setLocaleState] = useState<SupportedLocale>("en-US");

  const localeConfig = LOCALE_CONFIGS[locale];
  const isRTL = localeConfig.direction === "rtl";

  // Detect user's preferred locale
  const detectLocale = useCallback((): SupportedLocale => {
    const browserLocales = navigator.languages || [navigator.language];

    for (const browserLocale of browserLocales) {
      // Try exact match first
      if (browserLocale in LOCALE_CONFIGS) {
        return browserLocale as SupportedLocale;
      }

      // Try language match (e.g., 'en' for 'en-US')
      const language = browserLocale.split("-")[0];
      const fallback = Object.keys(LOCALE_CONFIGS).find((locale) =>
        locale.startsWith(language),
      );

      if (fallback) {
        return fallback as SupportedLocale;
      }
    }

    return "en-US"; // Default fallback
  }, []);

  // Initialize locale
  useEffect(() => {
    const storedLocale = localStorage.getItem("pp-locale") as SupportedLocale;
    if (storedLocale && storedLocale in LOCALE_CONFIGS) {
      setLocaleState(storedLocale);
    } else {
      const detectedLocale = detectLocale();
      setLocaleState(detectedLocale);
    }
  }, [detectLocale]);

  // Apply locale to document
  useEffect(() => {
    document.documentElement.lang = localeConfig.code;
    document.documentElement.dir = localeConfig.direction;

    // Apply font family if specified
    if (localeConfig.fontFamily) {
      document.documentElement.style.setProperty(
        "--locale-font-family",
        localeConfig.fontFamily,
      );
    }
  }, [localeConfig]);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem("pp-locale", newLocale);
  }, []);

  // Translation function
  const t = useCallback(
    (key: string, params?: Record<string, any>, count?: number): string => {
      const translations = TRANSLATIONS[locale] || TRANSLATIONS["en-US"];
      let translation = translations[key] || key;

      // Handle parameterization
      if (params) {
        Object.keys(params).forEach((param) => {
          translation = translation.replace(
            new RegExp(`{{${param}}}`, "g"),
            params[param],
          );
        });
      }

      // Handle pluralization (simplified)
      if (count !== undefined) {
        const pluralKey = count === 1 ? `${key}.one` : `${key}.other`;
        const pluralTranslation = translations[pluralKey];
        if (pluralTranslation) {
          translation = pluralTranslation.replace(
            "{{count}}",
            count.toString(),
          );
        }
      }

      return translation;
    },
    [locale],
  );

  const hasTranslation = useCallback(
    (key: string): boolean => {
      const translations = TRANSLATIONS[locale] || TRANSLATIONS["en-US"];
      return key in translations;
    },
    [locale],
  );

  // Formatters using Intl API
  const formatDate = useCallback(
    (
      date: Date,
      format: "short" | "medium" | "long" | "full" = "medium",
    ): string => {
      const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
        short: { dateStyle: "short" },
        medium: { dateStyle: "medium" },
        long: { dateStyle: "long" },
        full: { dateStyle: "full" },
      };

      return new Intl.DateTimeFormat(locale, formatOptions[format]).format(
        date,
      );
    },
    [locale],
  );

  const formatTime = useCallback(
    (date: Date, format: "short" | "medium" | "long" = "short"): string => {
      const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
        short: { timeStyle: "short" },
        medium: { timeStyle: "medium" },
        long: { timeStyle: "long" },
      };

      return new Intl.DateTimeFormat(locale, formatOptions[format]).format(
        date,
      );
    },
    [locale],
  );

  const formatNumber = useCallback(
    (number: number, options?: Intl.NumberFormatOptions): string => {
      return new Intl.NumberFormat(locale, options).format(number);
    },
    [locale],
  );

  const formatCurrency = useCallback(
    (amount: number, currency?: string): string => {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency || localeConfig.currency,
      }).format(amount);
    },
    [locale, localeConfig.currency],
  );

  const formatRelativeTime = useCallback(
    (date: Date): string => {
      const now = new Date();
      const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

      if (Math.abs(diffInSeconds) < 60) {
        return rtf.format(diffInSeconds, "second");
      } else if (Math.abs(diffInSeconds) < 3600) {
        return rtf.format(Math.floor(diffInSeconds / 60), "minute");
      } else if (Math.abs(diffInSeconds) < 86400) {
        return rtf.format(Math.floor(diffInSeconds / 3600), "hour");
      } else {
        return rtf.format(Math.floor(diffInSeconds / 86400), "day");
      }
    },
    [locale],
  );

  // Utility functions
  const getTextDirection = useCallback((): TextDirection => {
    return localeConfig.direction;
  }, [localeConfig]);

  const getReadingDirection = useCallback((): "horizontal" | "vertical" => {
    // Most languages use horizontal reading
    // Vertical might be used for traditional Chinese/Japanese in some contexts
    return "horizontal";
  }, []);

  const getLanguageCode = useCallback((): string => {
    return locale.split("-")[0];
  }, [locale]);

  const getRegionCode = useCallback((): string => {
    return locale.split("-")[1] || "";
  }, [locale]);

  const getAriaLabel = useCallback(
    (key: string, params?: Record<string, any>): string => {
      return t(key, params);
    },
    [t],
  );

  return {
    locale,
    localeConfig,
    setLocale,
    detectLocale,
    t,
    hasTranslation,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    isRTL,
    getTextDirection,
    getReadingDirection,
    getLanguageCode,
    getRegionCode,
    getAriaLabel,
  };
};
