import { Routes } from '@angular/router';
import { HomePage } from './home/home-page';

export const routes: Routes = [
  { path: '', component: HomePage },
  {
    path: 'spikes/slider-svg-spike',
    loadComponent: () =>
      import('./spikes/slider-svg-spike/slider-svg-spike.component').then(
        (m) => m.SliderSvgSpikeComponent,
      ),
  },
  {
    path: 'spikes/slider-segmented-hud-spike',
    loadComponent: () =>
      import('./spikes/slider-segmented-hud-spike/slider-segmented-hud-spike.component').then(
        (m) => m.SliderSegmentedHudSpikeComponent,
      ),
  },
  {
    path: 'spikes/slider-reticle-rail-spike',
    loadComponent: () =>
      import('./spikes/slider-reticle-rail-spike/slider-reticle-rail-spike.component').then(
        (m) => m.SliderReticleRailSpikeComponent,
      ),
  },
  {
    path: 'spikes/button-chamfer-hud-spike',
    loadComponent: () =>
      import('./spikes/button-chamfer-hud-spike/button-chamfer-hud-spike.component').then(
        (m) => m.ButtonChamferHudSpikeComponent,
      ),
  },
  {
    path: 'spikes/button-bracket-reticle-spike',
    loadComponent: () =>
      import('./spikes/button-bracket-reticle-spike/button-bracket-reticle-spike.component').then(
        (m) => m.ButtonBracketReticleSpikeComponent,
      ),
  },
  {
    path: 'spikes/button-trace-pill-spike',
    loadComponent: () =>
      import('./spikes/button-trace-pill-spike/button-trace-pill-spike.component').then(
        (m) => m.ButtonTracePillSpikeComponent,
      ),
  },
  {
    path: 'fixtures/pipeline',
    loadComponent: () =>
      import('./fixtures/pipeline/pipeline-fixture.component').then(
        (m) => m.PipelineFixtureComponent,
      ),
  },
  {
    path: 'fixtures/blank',
    loadComponent: () =>
      import('./fixtures/blank/blank-fixture.component').then((m) => m.BlankFixtureComponent),
  },
  {
    path: 'catalog',
    loadComponent: () => import('./catalog/catalog-page').then((m) => m.CatalogPage),
  },
  { path: '**', redirectTo: '' },
];
