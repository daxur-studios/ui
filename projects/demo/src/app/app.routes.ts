import { Routes } from '@angular/router';
import { HomePage } from './home/home-page';

export const routes: Routes = [
  { path: '', component: HomePage },
  {
    path: 'fixtures/pipeline',
    loadComponent: () =>
      import('./fixtures/pipeline/pipeline-fixture.component').then((m) => m.PipelineFixtureComponent),
  },
  { path: '**', redirectTo: '' },
];
