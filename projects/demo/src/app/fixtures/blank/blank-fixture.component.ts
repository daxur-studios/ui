import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';

/**
 * Blank fixture: a stage that renders solid black, so the blank-frame check must reject it. It is
 * not a spike, so it is not in the registry and never appears in the catalog.
 */
@Component({
  selector: 'demo-blank-fixture',
  templateUrl: './blank-fixture.component.html',
  styleUrl: './blank-fixture.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlankFixtureComponent {
  /** Set after the first rendered frame, so capture waits for a settled stage. */
  protected readonly ready = signal(false);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }
}
