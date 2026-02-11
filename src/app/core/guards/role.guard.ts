import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const RoleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as string[];
  const userRoles = authService.role;

  const hasRole = allowedRoles.some(role => userRoles.includes(role));

  if (hasRole) {
    return true;
  } else {
    return router.navigate(['/']);
  }
};
