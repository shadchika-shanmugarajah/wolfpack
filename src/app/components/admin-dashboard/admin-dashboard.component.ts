import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  pendingCount = signal(0);
  approvedCount = signal(0);
  totalCount = signal(0);

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateStats();
  }

  updateStats(): void {
    const pending = this.authService.getPendingClients().length;
    const approved = this.authService.getApprovedClients().length;
    this.pendingCount.set(pending);
    this.approvedCount.set(approved);
    this.totalCount.set(pending + approved);
  }

  getApprovedPercentage(): number {
    const total = this.totalCount();
    if (total === 0) return 0;
    return Math.round((this.approvedCount() / total) * 100);
  }

  getPendingPercentage(): number {
    const total = this.totalCount();
    if (total === 0) return 0;
    return Math.round((this.pendingCount() / total) * 100);
  }

  getPieChartBackground(): string {
    const approved = this.getApprovedPercentage();
    const pending = this.getPendingPercentage();
    return `conic-gradient(
      #22c55e 0% ${approved}%,
      #ff9800 ${approved}% ${approved + pending}%,
      #e5e7eb ${approved + pending}% 100%
    )`;
  }

  goToApprovals(): void {
    this.router.navigate(['/admin/approvals']);
  }

  logout(): void {
    this.authService.logout();
  }
}
