import { Component, OnDestroy, OnInit } from '@angular/core';
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
export class WaitingApprovalComponent implements OnInit, OnDestroy {
  private approvalCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkApprovalAndRedirect();
    this.approvalCheckTimer = setInterval(() => {
      this.checkApprovalAndRedirect();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.approvalCheckTimer) {
      clearInterval(this.approvalCheckTimer);
      this.approvalCheckTimer = null;
    }
  }

  private checkApprovalAndRedirect(): void {
    const user = this.authService.refreshCurrentUser();
    if (user?.approved) {
      this.router.navigate(['/client/dashboard']);
    }
  }

  refreshStatus(): void {
    this.checkApprovalAndRedirect();
  }

  getStatusLabel(): string {
    const status = this.authService.currentUser()?.approvalStatus;
    if (status === 'rejected') return 'Request Rejected';
    if (status === 'approved') return 'Approved';
    return 'Pending Approval';
  }

  getStatusMessage(): string {
    const status = this.authService.currentUser()?.approvalStatus;
    if (status === 'rejected') {
      return 'Your request was rejected. Please contact your trainer.';
    }
    return 'Waiting for trainer approval...';
  }
}



