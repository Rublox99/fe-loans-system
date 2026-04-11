import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';
import { CustomersComponent } from './customers/customers.component';
import { LoansComponent } from './loans/loans.component';
import { ReportsComponent } from './reports/reports.component';
import { LoanDetailsComponent } from './loans/loan-details/loan-details.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'customers', pathMatch: 'full' },
      { path: 'customers', component: CustomersComponent },
      {
        path: 'loans', children: [                                                   // 👈 new
          { path: '', component: LoansComponent },
          { path: ':id/details', component: LoanDetailsComponent },
        ]
      },
      { path: 'reports', component: ReportsComponent },
      { path: '**', redirectTo: 'customers' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }