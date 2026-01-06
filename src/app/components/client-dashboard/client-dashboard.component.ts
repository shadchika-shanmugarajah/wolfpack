import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService, DailyActivity } from '../../services/data.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss'
})
export class ClientDashboardComponent implements OnInit {
  todayActivity = signal<DailyActivity | null>(null);
  dailyWeight = signal<number | null>(null);
  weightHistory = signal<{ date: string; weight: number }[]>([]);
  completionRate = signal(0);

  constructor(
    public authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const today = this.dataService.getTodayActivity(user.id);
    this.todayActivity.set(today);

    const activities = this.dataService.getDailyActivities(user.id);
    this.weightHistory.set(
      activities
        .filter(a => a.weight)
        .map(a => ({ date: a.date, weight: a.weight! }))
        .sort((a, b) => a.date.localeCompare(b.date))
    );

    this.calculateCompletionRate();
  }

  updateWorkoutGoal(type: string, completed: number): void {
    const activity = this.todayActivity();
    if (!activity) return;

    const goal = activity.workoutGoals[type];
    if (goal) {
      goal.completed = completed;
      goal.done = completed >= goal.target;
      this.saveActivity();
      this.calculateCompletionRate();
    }
  }

  toggleWorkoutDone(type: string): void {
    const activity = this.todayActivity();
    if (!activity) return;

    const goal = activity.workoutGoals[type];
    if (goal) {
      goal.done = !goal.done;
      if (goal.done) {
        goal.completed = goal.target;
      }
      this.saveActivity();
      this.calculateCompletionRate();
    }
  }

  toggleMeal(mealType: string): void {
    const activity = this.todayActivity();
    if (!activity) return;

    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (meal) {
      meal.completed = !meal.completed;
      this.saveActivity();
      this.calculateCompletionRate();
    }
  }

  saveWeight(): void {
    const user = this.authService.currentUser();
    if (!user || !this.dailyWeight()) return;

    const activity = this.todayActivity();
    if (activity) {
      activity.weight = this.dailyWeight()!;
      this.saveActivity();
      this.weightHistory.set([
        ...this.weightHistory(),
        { date: activity.date, weight: this.dailyWeight()! }
      ]);
      this.dailyWeight.set(null);
    }
  }

  private saveActivity(): void {
    const user = this.authService.currentUser();
    const activity = this.todayActivity();
    if (user && activity) {
      this.dataService.saveDailyActivity(user.id, activity);
      this.todayActivity.set({ ...activity });
    }
  }

  private calculateCompletionRate(): void {
    const activity = this.todayActivity();
    if (!activity) {
      this.completionRate.set(0);
      return;
    }

    const workoutGoals = Object.values(activity.workoutGoals);
    const meals = Object.values(activity.meals);
    const totalItems = workoutGoals.length + meals.length;
    const completedItems =
      workoutGoals.filter(g => g.done).length + meals.filter(m => m.completed).length;

    this.completionRate.set(Math.round((completedItems / totalItems) * 100));
  }

  logout(): void {
    this.authService.logout();
  }

  getBarHeight(weight: number): number {
    const weights = this.weightHistory().map(w => w.weight);
    const max = weights.length > 0 ? Math.max(...weights) : 1;
    return max > 0 ? (weight / max) * 100 : 0;
  }

  getPushupsCompleted(): number {
    return this.todayActivity()?.workoutGoals?.pushups?.completed || 0;
  }

  getPushupsTarget(): number {
    return this.todayActivity()?.workoutGoals?.pushups?.target || 100;
  }

  getStepsCompleted(): number {
    return this.todayActivity()?.workoutGoals?.steps?.completed || 0;
  }

  getStepsTarget(): number {
    return this.todayActivity()?.workoutGoals?.steps?.target || 10000;
  }

  getPushupsDone(): boolean {
    return this.todayActivity()?.workoutGoals?.pushups?.done || false;
  }

  getStepsDone(): boolean {
    return this.todayActivity()?.workoutGoals?.steps?.done || false;
  }

  getMealItems(mealType: string): string {
    const activity = this.todayActivity();
    if (!activity) return 'No items assigned';
    const meal = activity.meals[mealType as keyof typeof activity.meals];
    return meal?.items?.join(', ') || 'No items assigned';
  }

  getMealCompleted(mealType: string): boolean {
    const activity = this.todayActivity();
    if (!activity) return false;
    const meal = activity.meals[mealType as keyof typeof activity.meals];
    return meal?.completed || false;
  }

  goToReport(): void {
    this.router.navigate(['/client/report']);
  }
}

