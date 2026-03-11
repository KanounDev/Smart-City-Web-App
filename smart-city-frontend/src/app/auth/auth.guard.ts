import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const requiredRole = route.data['role'] as string | undefined;

  if (!requiredRole) {
    return true;
  }

  const userRole = authService.getRole();

  if (userRole === requiredRole) {
    return true;
  }

  router.navigate(['/']);
  return false;
};