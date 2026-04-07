import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AppRoute, AppRoutesCollection } from '../../core/interfaces/app-route.interface';
import { APP_ROUTES } from '../../shared/constants';
import { WebIconComponent } from '../../shared/components/web-icon.component';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NzLayoutModule, NzMenuModule, NzIconModule, WebIconComponent],
})
export class MainLayoutComponent {
  appRoutes: AppRoute[] = Object
    .values(APP_ROUTES)
    .filter(route => route.label !== 'Auth')

  constructor(
    private router: Router
  ) { }

  signOut() {
    this.router.navigateByUrl(APP_ROUTES.login.path)
  }
}
