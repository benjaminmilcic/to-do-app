import { Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageService } from '../core/i18n';

/** Segmented "DE · EN · HR" switch with a sliding highlight. */
@Component({
  selector: 'app-language-switch',
  template: `
    <div
      class="switch"
      role="radiogroup"
      [attr.aria-label]="'language.label' | transloco"
    >
      <span
        class="indicator"
        aria-hidden="true"
        [style.transform]="'translateX(' + index() * 100 + '%)'"
      ></span>
      @for (lang of language.languages; track lang) {
        <button
          type="button"
          role="radio"
          [class.active]="lang === language.current()"
          [attr.aria-checked]="lang === language.current()"
          [attr.lang]="lang"
          [title]="'language.' + lang | transloco"
          (click)="language.set(lang)"
        >
          {{ lang }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    .switch {
      position: relative;
      display: grid;
      grid-template-columns: repeat(3, 44px);
      padding: 3px;
      border-radius: 999px;
      background: var(--app-chip);
    }

    .indicator {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 44px;
      height: calc(100% - 6px);
      border-radius: 999px;
      background: var(--ion-color-primary);
      box-shadow: 0 2px 8px rgb(var(--ion-color-primary-rgb) / 35%);
      transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    button {
      position: relative;
      height: 30px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--ion-color-medium);
      font: inherit;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      transition: color 0.2s;
    }

    button.active {
      color: var(--ion-color-primary-contrast);
    }

    button:not(.active):hover {
      color: var(--ion-text-color);
    }

    button:focus-visible {
      outline: 2px solid var(--ion-color-primary);
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      .indicator {
        transition: none;
      }
    }
  `,
  imports: [TranslocoPipe],
})
export class LanguageSwitchComponent {
  protected readonly language = inject(LanguageService);
  protected readonly index = computed(() =>
    this.language.languages.indexOf(this.language.current()),
  );
}
