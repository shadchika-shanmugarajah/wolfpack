import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-client-progress',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './client-progress.component.html',
  styleUrl: './client-progress.component.scss'
})
export class ClientProgressComponent implements OnInit {
  userId = signal<string>('');
  clientEmail = signal<string>('');
  activities = signal<any[]>([]);
  weightHistory = signal<{ date: string; weight: number }[]>([]);
  completionStats = signal<any>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public authService: AuthService,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (userId) {
      this.userId.set(userId);
      const user = this.authService.getAllUsers().find(u => u.id === userId);
      if (user) {
        this.clientEmail.set(user.email);
      }
      this.loadProgress();
    }
  }

  loadProgress(): void {
    if (!this.userId()) return;

    const activities = this.dataService.getDailyActivities(this.userId()!);
    this.activities.set(activities);

    this.weightHistory.set(
      activities
        .filter(a => a.weight)
        .map(a => ({ date: a.date, weight: a.weight! }))
        .sort((a, b) => a.date.localeCompare(b.date))
    );

    this.calculateStats();
  }

  calculateStats(): void {
    const activities = this.activities();
    if (activities.length === 0) {
      this.completionStats.set(null);
      return;
    }

    const totalWorkouts = activities.reduce((sum: number, a: any) => {
      return sum + Object.values(a.workoutGoals).filter((g: any) => g.done).length;
    }, 0);

    const totalMeals = activities.reduce((sum: number, a: any) => {
      return sum + Object.values(a.meals).filter((m: any) => m.completed).length;
    }, 0);

    const totalPossible = activities.length * 6;
    const completionRate = totalPossible > 0 ? Math.round((totalWorkouts + totalMeals) / totalPossible * 100) : 0;

    this.completionStats.set({
      totalWorkouts,
      totalMeals,
      completionRate,
      daysTracked: activities.length
    });
  }

  getMaxWeight(): number {
    const weights = this.weightHistory().map(w => w.weight);
    return weights.length > 0 ? Math.max(...weights) : 1;
  }

  getBarHeight(weight: number): number {
    const max = this.getMaxWeight();
    return max > 0 ? (weight / max) * 100 : 0;
  }

  getWorkoutCount(activity: any): number {
    return Object.values(activity.workoutGoals).filter((g: any) => g.done).length;
  }

  getMealCount(activity: any): number {
    return Object.values(activity.meals).filter((m: any) => m.completed).length;
  }

  getWorkoutTotal(activity: any): number {
    return Object.keys(activity.workoutGoals).length;
  }

  getMealTotal(activity: any): number {
    return Object.keys(activity.meals).length;
  }

  getRecentActivities(): any[] {
    return this.activities().slice().reverse().slice(0, 10);
  }

  goBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}

