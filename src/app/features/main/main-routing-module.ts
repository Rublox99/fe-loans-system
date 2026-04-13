import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { LoansComponent } from './loans/loans.component';
import { ReportsComponent } from './reports/reports.component';
import { LoanDetailsComponent } from './loans/loan-details/loan-details.component';
import { EntitiessComponent } from './customers/entities.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'entities', pathMatch: 'full' },
      { path: 'entities', component: EntitiessComponent },
      {
        path: 'loans', children: [
          { path: '', component: LoansComponent },
          { path: ':id/details', component: LoanDetailsComponent },
        ]
      },
      { path: 'reports', component: ReportsComponent },
      { path: '**', redirectTo: 'entities' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }