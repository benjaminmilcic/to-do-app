import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { addIcons } from 'ionicons';
import { contrastOutline, moonOutline, sunnyOutline } from 'ionicons/icons';
import { THEMES, type Theme, ThemeService } from '../core/theme.service';
import {
  type SegmentOption,
  SegmentedSwitchComponent,
} from './segmented-switch.component';

const ICONS: Record<Theme, string> = {
  system: 'contrast-outline',
  light: 'sunny-outline',
  dark: 'moon-outline',
};

/** System · Light · Dark switch. */
@Component({
  selector: 'app-theme-switch',
  template: `
    <app-segmented-switch
      [options]="options"
      [value]="themes.theme()"
      [ariaLabel]="'theme.label' | transloco"
      (changed)="themes.set($event)"
    />
  `,
  imports: [SegmentedSwitchComponent, TranslocoPipe],
})
export class ThemeSwitchComponent {
  protected readonly themes = inject(ThemeService);
  protected readonly options: SegmentOption<Theme>[] = THEMES.map((theme) => ({
    value: theme,
    icon: ICONS[theme],
    titleKey: `theme.${theme}`,
  }));

  constructor() {
    addIcons({ contrastOutline, moonOutline, sunnyOutline });
  }
}
