// convocatorias-routing.module.ts - SIN COMPONENTE PADRE
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConvocatoriaDetailComponent } from './pages/convocatoria-detail/convocatoria-detail.component';
import { ConvocatoriasListComponent } from './pages/convocatorias-list/convocatorias-list.component';
import { roleGuard } from 'src/app/services/guards/admin-guard';

const routes: Routes = [
  {
    path: '',
    component: ConvocatoriasListComponent,
    canActivate: [roleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: ':id',
    component: ConvocatoriaDetailComponent,
    canActivate: [roleGuard],
    data: { roles: ['admin'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConvocatoriasRoutingModule { }