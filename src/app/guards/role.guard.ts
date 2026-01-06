import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  const requiredRole = route.data?.['role'];
  const requiresApproval = route.data?.['requiresApproval'];

  if (requiredRole && user.role !== requiredRole) {
    router.navigate(['/login']);
    return false;
  }

  if (requiresApproval && !user.approved) {
    router.navigate(['/client/waiting']);
    return false;
  }

  return true;
};

