import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { DataService, DailyActivity, FoodItem } from '../../services/data.service';

@Component({
  selector: 'app-client-monitoring',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-monitoring.component.html',
  styleUrl: './client-monitoring.component.scss'
})
export class ClientMonitoringComponent implements OnInit {
  approvedClients = signal<User[]>([]);
  selectedClient = signal<User | null>(null);

  constructor(
    public authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadApprovedClients();
  }

  loadApprovedClients(): void {
    const clients = this.authService.getApprovedClients();
    this.approvedClients.set(clients);
  }

  getClientProfile(userId: string) {
    return this.dataService.getClientProfile(userId);
  }

  getClientActivity(userId: string): DailyActivity | null {
    return this.dataService.getTodayActivity(userId);
  }

  getMealItems(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', userId: string): FoodItem[] {
    const activity = this.getClientActivity(userId);
    if (!activity) return [];
    const meal = activity.meals[mealType];
    return meal?.items || [];
  }

  getMealCaloriesConsumed(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', userId: string): number {
    const items = this.getMealItems(mealType, userId);
    return items
      .filter(item => item.consumed === true)
      .reduce((total, item) => total + (item.calories || 0), 0);
  }

  getTotalCaloriesConsumed(userId: string): number {
    const activity = this.getClientActivity(userId);
    return activity?.caloriesConsumed || 0;
  }

  getTotalCaloriesBurned(userId: string): number {
    const activity = this.getClientActivity(userId);
    return activity?.caloriesBurned || 0;
  }

  isFoodConsumed(item: FoodItem): boolean {
    return item.consumed === true;
  }

  isFoodPrescribed(item: FoodItem): boolean {
    return item.isPrescribed === true;
  }

  selectClient(client: User): void {
    if (this.selectedClient()?.id === client.id) {
      // Deselect if clicking the same client
      this.selectedClient.set(null);
    } else {
      this.selectedClient.set(client);
    }
  }

  getClientInitials(user: User): string {
    if (user.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  }

  viewClientProgress(userId: string): void {
    this.router.navigate(['/admin/client-progress', userId]);
  }

  assignDietPlan(userId: string): void {
    this.router.navigate(['/admin/diet-plan', userId]);
  }

  assignWorkoutPlan(userId: string): void {
    this.router.navigate(['/admin/workout-plan', userId]);
  }

  goBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  logout(): void {
    this.authService.logout();
  }
}

