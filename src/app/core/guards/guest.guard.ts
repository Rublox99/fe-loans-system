import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/pages/auth.service';

export const guestGuard: CanActivateFn = async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const isAuthenticated = await authService.isAuthenticated();

    if (isAuthenticated) {
        router.navigate(['/v1/main']);
        return false;
    }

    return true;
};