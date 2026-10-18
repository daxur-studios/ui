import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';

/**
 * Pipeline fixture: a visible stage that proves the thumbnail capture path works. It is not a spike,
 * so it is not in the registry and never appears in the catalog.
 */
@Component({
  selector: 'demo-pipeline-fixture',
  templateUrl: './pipeline-fixture.component.html',
  styleUrl: './pipeline-fixture.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineFixtureComponent {
  /** Set after the first rendered frame, so capture waits for a settled stage. */
  protected readonly ready = signal(false);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }
}
