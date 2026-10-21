import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiThemePickerComponent } from '@daxur-studios/ui';

/** Root shell for the demo harness. Spike and example pages render inside the router outlet. */
@Component({
  selector: 'demo-root',
  imports: [RouterOutlet, UiThemePickerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
