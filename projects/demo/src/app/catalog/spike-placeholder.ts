import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Stands in for a spike thumbnail that is missing or not yet captured. It is a component, not an
 * SVG file, so it can read the page's `--ui-*` tokens.
 */
@Component({
  selector: 'app-spike-placeholder',
  templateUrl: './spike-placeholder.html',
  styleUrl: './spike-placeholder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpikePlaceholderComponent {
  readonly label = input.required<string>();
}
