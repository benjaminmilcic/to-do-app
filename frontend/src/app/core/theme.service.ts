import { Injectable, signal } from '@angular/core';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Keep in sync with the inline script in index.html. */
const STORAGE_KEY = 'todo.theme';
/** Browser/PWA title bar colour, matches --app-backdrop. */
const THEME_COLORS = { light: '#f3f2fb', dark: '#0f0e17' } as const;

/**
 * Light/dark appearance. "system" follows the operating system and reacts
 * live when it changes. The choice is kept in localStorage.
 *
 * Dark mode is the `ion-palette-dark` class on <html> (Ionic's class-based
 * dark palette plus our own colours in theme/variables.scss). index.html
 * already sets it before Angular starts, so there is no light flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  readonly theme = signal<Theme>(readStoredTheme());

  constructor() {
    this.apply();
    this.systemDark.addEventListener('change', () => {
      if (this.theme() === 'system') {
        this.apply();
      }
    });
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage disabled: the choice lasts this session.
    }
    this.apply();
  }

  private apply(): void {
    const theme = this.theme();
    const dark =
      theme === 'dark' || (theme === 'system' && this.systemDark.matches);

    document.documentElement.classList.toggle('ion-palette-dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.removeAttribute('media');
      meta.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
    }

    if (Capacitor.isNativePlatform()) {
      // Light icons on dark bars and vice versa.
      void SystemBars.setStyle({
        style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
      }).catch(() => undefined);
    }
  }
}

function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (THEMES.includes(saved as Theme)) {
      return saved as Theme;
    }
  } catch {
    // Storage not available.
  }
  return 'system';
}
