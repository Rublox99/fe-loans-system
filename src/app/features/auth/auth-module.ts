import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './auth-routing-module';
import { AuthComponent } from './auth.component';

@NgModule({
  declarations: [],
  imports: [CommonModule, HomeRoutingModule, AuthComponent],
})
export class AuthModule {}
