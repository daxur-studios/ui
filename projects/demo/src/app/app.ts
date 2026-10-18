import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Root shell for the demo harness. Spike and example pages render inside the router outlet. */
@Component({
  selector: 'demo-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
