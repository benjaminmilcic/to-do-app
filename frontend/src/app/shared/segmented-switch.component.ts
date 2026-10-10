import { Component, computed, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';

export interface SegmentOption<T extends string> {
  value: T;
  /** Short visible text (e.g. "DE"); omit when an icon is given. */
  label?: string;
  /** Ionicon name shown instead of a label. */
  icon?: string;
  /** Translation key of the full name, used as tooltip and accessible name. */
  titleKey: string;
}

/**
 * Pill-shaped segmented switch with a sliding highlight, used for the
 * language and the appearance setting.
 */
@Component({
  selector: 'app-segmented-switch',
  template: `
    <div class="switch" role="radiogroup" [attr.aria-label]="ariaLabel()">
      <span
        class="indicator"
        aria-hidden="true"
        [style.transform]="'translateX(' + index() * 100 + '%)'"
      ></span>
      @for (option of options(); track option.value) {
        <button
          type="button"
          role="radio"
          [class.active]="option.value === value()"
          [attr.aria-checked]="option.value === value()"
          [attr.aria-label]="option.titleKey | transloco"
          [title]="option.titleKey | transloco"
          (click)="changed.emit(option.value)"
        >
          @if (option.icon) {
            <ion-icon [name]="option.icon" aria-hidden="true" />
          } @else {
            {{ option.label }}
          }
        </button>
      }
    </div>
  `,
  styles: `
    /* Segment width: --segment-width, set by a parent if needed (default 44px). */
    :host {
      display: inline-block;
    }

    .switch {
      position: relative;
      display: grid;
      grid-auto-columns: var(--segment-width, 44px);
      grid-auto-flow: column;
      padding: 3px;
      border-radius: 999px;
      background: var(--app-chip);
    }

    .indicator {
      position: absolute;
      top: 3px;
      left: 3px;
      width: var(--segment-width, 44px);
      height: calc(100% - 6px);
      border-radius: 999px;
      background: var(--ion-color-primary);
      box-shadow: 0 2px 8px rgb(var(--ion-color-primary-rgb) / 35%);
      transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    button {
      position: relative;
      display: grid;
      place-items: center;
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

    ion-icon {
      font-size: 1.05rem;
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
  imports: [IonIcon, TranslocoPipe],
})
export class SegmentedSwitchComponent<T extends string> {
  readonly options = input.required<SegmentOption<T>[]>();
  readonly value = input.required<T>();
  readonly ariaLabel = input.required<string>();
  readonly changed = output<T>();

  protected readonly index = computed(() =>
    Math.max(
      0,
      this.options().findIndex((option) => option.value === this.value()),
    ),
  );
}
