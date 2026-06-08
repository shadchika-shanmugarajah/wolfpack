import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-waiting-approval',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waiting-approval.component.html',
  styleUrl: './waiting-approval.component.scss'
})
export class WaitingApprovalComponent {
  checkingStatus = signal(false);

  isApproved = computed(() => {
    const user = this.authService.currentUser();
    return user?.approved ?? false;
  });

  approvalStatus = computed(() => {
    const user = this.authService.currentUser();
    return user?.approvalStatus ?? 'pending';
  });

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  refreshStatus(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    this.checkingStatus.set(true);
    
    // Simulate trainer approval checking backend by setting timer
    setTimeout(() => {
      this.authService.approveClient(user.id);
      this.authService.refreshCurrentUser();
      this.checkingStatus.set(false);
    }, 1500);
  }

  enterDashboard(): void {
    if (this.isApproved()) {
      this.router.navigate(['/client/dashboard']);
    }
  }

  getStatusLabel(): string {
    if (this.isApproved()) return 'Approved';
    if (this.approvalStatus() === 'rejected') return 'Request Rejected';
    return 'Pending Approval';
  }

  getStatusMessage(): string {
    if (this.isApproved()) {
      return 'Your trainer has approved your profile. You can now access your customized plans!';
    }
    if (this.approvalStatus() === 'rejected') {
      return 'Your request was rejected. Please contact your trainer.';
    }
    return 'Waiting for trainer approval...';
  }
}
