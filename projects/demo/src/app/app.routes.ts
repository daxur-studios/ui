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
