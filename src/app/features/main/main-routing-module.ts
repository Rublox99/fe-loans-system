import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomersComponent } from './customers/customers.component';
import { LoansComponent } from './loans/loans.component';
import { ReportsComponent } from './reports/reports.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'customers',
    pathMatch: 'full'
  },
  { path: 'customers', component: CustomersComponent },
  { path: 'loans', component: LoansComponent },
  { path: 'reports', component: ReportsComponent },
  {
    path: '**',
    redirectTo: 'customers'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainRoutingModule { }