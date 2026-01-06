import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'client',
    canActivate: [authGuard],
    children: [
      {
        path: 'setup',
        loadComponent: () => import('./components/client-setup/client-setup.component').then(m => m.ClientSetupComponent)
      },
      {
        path: 'waiting',
        loadComponent: () => import('./components/waiting-approval/waiting-approval.component').then(m => m.WaitingApprovalComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent),
        canActivate: [roleGuard],
        data: { role: 'client', requiresApproval: true }
      },
      {
        path: 'report',
        loadComponent: () => import('./components/monthly-report/monthly-report.component').then(m => m.MonthlyReportComponent),
        canActivate: [roleGuard],
        data: { role: 'client', requiresApproval: true }
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'approvals',
        loadComponent: () => import('./components/client-approval/client-approval.component').then(m => m.ClientApprovalComponent)
      },
      {
        path: 'diet-plan/:userId',
        loadComponent: () => import('./components/diet-plan/diet-plan.component').then(m => m.DietPlanComponent)
      },
      {
        path: 'workout-plan/:userId',
        loadComponent: () => import('./components/workout-plan/workout-plan.component').then(m => m.WorkoutPlanComponent)
      },
      {
        path: 'client-progress/:userId',
        loadComponent: () => import('./components/client-progress/client-progress.component').then(m => m.ClientProgressComponent)
      }
    ]
  }
];
