import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  UI_THEME_DENSITIES,
  UI_THEME_MODES,
  UI_THEME_SCHEMES,
  type UiThemeDensity,
  type UiThemeMode,
  type UiThemeScheme,
} from '../theme-presets';
import { UiThemeService } from '../theme.service';

/**
 * Segmented control for the three theme axes (scheme, mode, density). It reads and writes
 * {@link UiThemeService}, so a single mounted instance restyles the whole document through
 * the `data-ui-*` attribute scopes. The component is layout-neutral: consumers position it.
 */
@Component({
  selector: 'ui--theme-picker',
  standalone: true,
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiThemePickerComponent {
  private readonly theme = inject(UiThemeService);

  /** Scheme options for the first group. */
  protected readonly schemes = UI_THEME_SCHEMES;
  /** Mode options for the second group. */
  protected readonly modes = UI_THEME_MODES;
  /** Density options for the third group. */
  protected readonly densities = UI_THEME_DENSITIES;

  protected readonly scheme = this.theme.scheme;
  protected readonly mode = this.theme.mode;
  protected readonly density = this.theme.density;

  protected selectScheme(value: UiThemeScheme): void {
    this.theme.setScheme(value);
  }

  protected selectMode(value: UiThemeMode): void {
    this.theme.setMode(value);
  }

  protected selectDensity(value: UiThemeDensity): void {
    this.theme.setDensity(value);
  }
}
