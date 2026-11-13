import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ChromeKitWindowComponent } from './chrome-kit-window.component';

/**
 * Spike 09f: calm chrome tube kit for cybersigil UI frames.
 *
 * Purpose: test whether layout-fitted tube rails (edge rail, cradled medallion, whiplash ribs,
 * corner curls, pinched dividers, dendritic connector, fine card frames) reproduce the feel of
 * `cyber (1)` and `cyber (3)` while the seed varies only the ornament.
 */
@Component({
  selector: 'app-cybersigil-chrome-kit-spike',
  imports: [ChromeKitWindowComponent],
  templateUrl: './cybersigil-chrome-kit-spike.component.html',
  styleUrl: './cybersigil-chrome-kit-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CybersigilChromeKitSpikeComponent {
  protected readonly seed = signal(1);

  protected previous(): void {
    this.seed.update((s) => Math.max(1, s - 1));
  }

  protected next(): void {
    this.seed.update((s) => s + 1);
  }
}
