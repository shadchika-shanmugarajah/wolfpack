import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-client-approval',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-approval.component.html',
  styleUrl: './client-approval.component.scss'
})
export class ClientApprovalComponent implements OnInit {
  pendingClients = signal<User[]>([]);
  selectedClient = signal<User | null>(null);
  clientProfile = signal<any>(null);

  constructor(
    public authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPendingClients();
  }

  loadPendingClients(): void {
    this.pendingClients.set(this.authService.getPendingClients());
  }

  selectClient(client: User): void {
    this.selectedClient.set(client);
    const profile = this.dataService.getClientProfile(client.id);
    this.clientProfile.set(profile);
  }

  approveClient(): void {
    const client = this.selectedClient();
    if (!client) return;

    this.authService.approveClient(client.id);
    this.loadPendingClients();
    this.selectedClient.set(null);
    this.clientProfile.set(null);
  }

  rejectClient(): void {
    const client = this.selectedClient();
    if (!client) return;

    if (confirm('Are you sure you want to reject this client?')) {
      this.authService.rejectClient(client.id);
      this.loadPendingClients();
      this.selectedClient.set(null);
      this.clientProfile.set(null);
    }
  }

  assignPlans(): void {
    const client = this.selectedClient();
    if (!client) return;

    this.approveClient();
    this.router.navigate(['/admin/diet-plan', client.id]);
  }

  goBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  getBMIColor(bmi: number): string {
    if (bmi < 18.5) return '#4A90E2';
    if (bmi < 25) return '#4CAF50';
    if (bmi < 30) return '#FF9800';
    return '#F44336';
  }
}

