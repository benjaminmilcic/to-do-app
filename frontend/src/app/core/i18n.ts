import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeHr from '@angular/common/locales/hr';
import {
  Injectable,
  type EnvironmentProviders,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
  signal,
} from '@angular/core';
import {
  type Translation,
  type TranslocoLoader,
  TranslocoService,
  provideTransloco,
} from '@jsverse/transloco';
import { firstValueFrom, from, type Observable } from 'rxjs';

export const LANGUAGES = ['de', 'en', 'hr'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'todo.language';
const FALLBACK: Language = 'de';

/**
 * Translations are bundled (one lazy chunk per language) instead of fetched
 * from /assets, so they also work offline and inside the Android app.
 */
const TRANSLATIONS: Record<Language, () => Promise<{ default: Translation }>> =
  {
    de: () => import('../../i18n/de.json'),
    en: () => import('../../i18n/en.json'),
    hr: () => import('../../i18n/hr.json'),
  };

@Injectable({ providedIn: 'root' })
class BundledTranslationLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    const load = TRANSLATIONS[lang as Language] ?? TRANSLATIONS[FALLBACK];
    return from(load().then((module) => module.default));
  }
}

registerLocaleData(localeDe);
registerLocaleData(localeHr);

export function provideI18n(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTransloco({
      config: {
        availableLangs: [...LANGUAGES],
        defaultLang: initialLanguage(),
        fallbackLang: FALLBACK,
        missingHandler: { useFallbackTranslation: true },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: BundledTranslationLoader,
    }),
    // Load the active language before the first render, so no raw keys
    // flash up on startup.
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      return firstValueFrom(transloco.load(transloco.getActiveLang()));
    }),
  ]);
}

/** Current language plus switching; the choice is kept in localStorage. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);

  readonly languages = LANGUAGES;
  readonly current = signal<Language>(
    this.transloco.getActiveLang() as Language,
  );

  constructor() {
    document.documentElement.lang = this.current();
  }

  set(language: Language): void {
    if (language === this.current()) {
      return;
    }
    this.transloco.setActiveLang(language);
    this.current.set(language);
    document.documentElement.lang = language;
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Storage disabled (e.g. private mode): the choice lasts this session.
    }
  }
}

/** Saved choice, else the browser/phone language, else German. */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) {
      return saved;
    }
  } catch {
    // Storage not available: fall through to the browser language.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLanguage(base)) {
      return base;
    }
  }
  return FALLBACK;
}

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}
