import { Component, OnInit } from '@angular/core';
import { WebIconComponent } from '../../shared/components/web-icon.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgZorroModule } from '../../shared/modules/ng-zorro.module';
import { Router } from '@angular/router';
import { AppRoutesCollection } from '../../core/interfaces/app-route.interface';
import { APP_ROUTES } from '../../shared/constants';
import { AppLogoComponent } from '../../shared/components/app-logo.component';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  imports: [WebIconComponent, AppLogoComponent, FormsModule, ReactiveFormsModule, NgZorroModule]
})
export class AuthComponent implements OnInit {
  currentYear: number = new Date().getFullYear();
  appRoutes: AppRoutesCollection = APP_ROUTES

  isLoadingResponse: boolean = false

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  })

  constructor(
    private router: Router
  ) { }

  ngOnInit() { }

  queryLogin() {
    this.isLoadingResponse = true

    setTimeout(() => {
      this.isLoadingResponse = false
      this.router.navigateByUrl(this.appRoutes.customers.path);
    }, 1500);
  }
}
