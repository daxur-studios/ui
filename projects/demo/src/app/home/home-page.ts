import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UI_LIB_VERSION } from '@daxur-studios/ui';

/**
 * Harness landing page. It proves the demo compiles against library source
 * through the `@daxur-studios/ui` path alias and gives the Playwright smoke
 * test a stable readiness marker.
 */
@Component({
  selector: 'demo-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly libraryVersion = UI_LIB_VERSION;
}
