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
  showRejectModal = signal(false);

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
    this.showRejectModal.set(true);
  }

  confirmReject(): void {
    const client = this.selectedClient();
    if (client) {
      this.authService.rejectClient(client.id);
      this.loadPendingClients();
      this.selectedClient.set(null);
      this.clientProfile.set(null);
    }
    this.showRejectModal.set(false);
  }

  cancelReject(): void {
    this.showRejectModal.set(false);
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
    if (bmi < 18.5) return '#3b82f6'; // Premium Blue
    if (bmi < 25) return '#22c55e'; // Vibrant Green for Normal BMI
    if (bmi < 30) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  }

  getDietType(foodPreferences: string): string {
    if (!foodPreferences) return 'Non-Vegetarian';
    const lower = foodPreferences.toLowerCase();
    if (lower.includes('non-vegetarian') || lower.includes('non vegetarian') || lower.includes('non-veg')) {
      return 'Non-Vegetarian';
    }
    if (lower.includes('vegetarian') || lower.includes('veg')) {
      return 'Vegetarian';
    }
    if (lower.includes('vegan')) {
      return 'Vegan';
    }
    return 'Non-Vegetarian';
  }
}

