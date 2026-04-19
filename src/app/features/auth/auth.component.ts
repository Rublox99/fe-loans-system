import { Component, OnInit } from '@angular/core';
import { WebIconComponent } from '../../shared/components/web-icon.component';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgZorroModule } from '../../shared/modules/ng-zorro.module';
import { Router } from '@angular/router';
import { AppRoutesCollection } from '../../core/interfaces/app-route.interface';
import { APP_ROUTES } from '../../shared/constants';
import { AppLogoComponent } from '../../shared/components/app-logo.component';
import { AuthService } from '../../core/services/pages/auth.service';
import { GeneralService } from '../../core/services/general.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  imports: [WebIconComponent, AppLogoComponent, FormsModule, ReactiveFormsModule, NgZorroModule]
})
export class AuthComponent implements OnInit {
  currentYear: number = new Date().getFullYear();
  appRoutes: AppRoutesCollection = APP_ROUTES;

  isLoadingResponse: boolean = false;
  passwordVisible: boolean = false
  formSubmitted: boolean = false;

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  constructor(
    private router: Router,
    private authService: AuthService,
    private generalService: GeneralService
  ) { }

  ngOnInit() { }

  // Helper for cleaner template access
  get f() {
    return this.loginForm.controls;
  }

  async queryLogin() {
    this.formSubmitted = true;

    if (this.loginForm.invalid) return;

    this.isLoadingResponse = true;

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.signIn(email!, password!);
      this.router.navigateByUrl(this.appRoutes.entities.path);
    } catch (error: any) {
      this.generalService.createMessage(
        'error',
        'Error al iniciar sesión. Intente nuevamente.'
      );
    } finally {
      this.isLoadingResponse = false;
    }
  }
}