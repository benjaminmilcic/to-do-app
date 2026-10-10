import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { type Language, LanguageService } from '../core/i18n';
import {
  type SegmentOption,
  SegmentedSwitchComponent,
} from './segmented-switch.component';

/** "DE · EN · HR" switch. */
@Component({
  selector: 'app-language-switch',
  template: `
    <app-segmented-switch
      [options]="options"
      [value]="language.current()"
      [ariaLabel]="'language.label' | transloco"
      (changed)="language.set($event)"
    />
  `,
  imports: [SegmentedSwitchComponent, TranslocoPipe],
})
export class LanguageSwitchComponent {
  protected readonly language = inject(LanguageService);
  protected readonly options: SegmentOption<Language>[] =
    this.language.languages.map((lang) => ({
      value: lang,
      label: lang,
      titleKey: `language.${lang}`,
    }));
}
