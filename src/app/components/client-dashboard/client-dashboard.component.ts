import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService, DailyActivity, MonthlyMeasurement } from '../../services/data.service';

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
  
  // Monthly Measurements
  currentMeasurement = signal<MonthlyMeasurement | null>(null);
  previousMeasurement = signal<MonthlyMeasurement | null>(null);
  showMeasurementForm = signal(false);
  isEditing = signal(false);
  
  // Form object (not signal, for ngModel binding)
  measurementForm: {
    height: number | null;
    weight: number | null;
    shoulder: number | null;
    chest: number | null;
    waist: number | null;
    belly: number | null;
    rightArm: number | null;
    leftArm: number | null;
    rightLeg: number | null;
    leftLeg: number | null;
    pushupCount: number | null;
    pullupCount: number | null;
  } = {
    height: null,
    weight: null,
    shoulder: null,
    chest: null,
    waist: null,
    belly: null,
    rightArm: null,
    leftArm: null,
    rightLeg: null,
    leftLeg: null,
    pushupCount: null,
    pullupCount: null
  };

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

    // Initialize calories if not set
    if (!today.caloriesConsumed) {
      today.caloriesConsumed = this.getCaloriesConsumed();
    }
    if (!today.caloriesBurned) {
      today.caloriesBurned = 0;
    }

    const activities = this.dataService.getDailyActivities(user.id);
    this.weightHistory.set(
      activities
        .filter(a => a.weight)
        .map(a => ({ date: a.date, weight: a.weight! }))
        .sort((a, b) => a.date.localeCompare(b.date))
    );

    this.calculateCompletionRate();
    this.loadMeasurements();
  }

  loadMeasurements(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const current = this.dataService.getCurrentMonthMeasurement(user.id);
    const previous = this.dataService.getPreviousMonthMeasurement(user.id);
    
    this.currentMeasurement.set(current || null);
    this.previousMeasurement.set(previous || null);

    // If no current measurement, load from client profile as starting point
    if (!current) {
      const profile = this.dataService.getClientProfile(user.id);
      if (profile) {
        this.measurementForm = {
          height: profile.height,
          weight: profile.weight,
          shoulder: null,
          chest: null,
          waist: null,
          belly: null,
          rightArm: null,
          leftArm: null,
          rightLeg: null,
          leftLeg: null,
          pushupCount: null,
          pullupCount: null
        };
      }
    } else {
      // Load current measurement into form
      this.measurementForm = {
        height: current.height,
        weight: current.weight,
        shoulder: current.shoulder,
        chest: current.chest,
        waist: current.waist,
        belly: current.belly,
        rightArm: current.rightArm,
        leftArm: current.leftArm,
        rightLeg: current.rightLeg,
        leftLeg: current.leftLeg,
        pushupCount: current.pushupCount,
        pullupCount: current.pullupCount
      };
    }
  }

  updateWorkoutGoal(type: string, completed: number): void {
    const activity = this.todayActivity();
    if (!activity) return;

    const goal = activity.workoutGoals[type];
    if (goal) {
      goal.completed = completed;
      goal.done = completed >= goal.target;
      // Update calories burned when goal is updated
      if (goal.done) {
        goal.caloriesBurned = this.calculateCaloriesBurned(type, goal.completed);
      } else {
        goal.caloriesBurned = this.calculateCaloriesBurned(type, goal.completed);
      }
      this.saveActivity();
      this.calculateCompletionRate();
      this.updateCaloriesBurned();
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
        // Calculate calories burned
        goal.caloriesBurned = this.calculateCaloriesBurned(type, goal.completed);
      } else {
        goal.caloriesBurned = 0;
      }
      this.saveActivity();
      this.calculateCompletionRate();
      this.updateCaloriesBurned();
    }
  }

  calculateCaloriesBurned(exerciseType: string, amount: number): number {
    // Calorie burn rates (calories per unit)
    const rates: { [key: string]: number } = {
      pushups: 0.5, // ~0.5 calories per pushup
      steps: 0.04,  // ~0.04 calories per step (varies by weight, using average)
    };
    
    const rate = rates[exerciseType] || 0;
    return Math.round(amount * rate);
  }

  updateCaloriesBurned(): void {
    const activity = this.todayActivity();
    if (!activity) return;

    let totalBurned = 0;
    Object.values(activity.workoutGoals).forEach(goal => {
      if (goal.caloriesBurned) {
        totalBurned += goal.caloriesBurned;
      }
    });
    
    activity.caloriesBurned = totalBurned;
    this.saveActivity();
  }

  getCaloriesConsumed(): number {
    const activity = this.todayActivity();
    if (!activity) return 0;
    
    let total = 0;
    Object.values(activity.meals).forEach(meal => {
      if (meal.items) {
        meal.items.forEach((item: any) => {
          // Only count calories from consumed items (consumed === true)
          if (item.calories && item.consumed === true) {
            total += item.calories;
          }
        });
      }
    });
    return total;
  }

  getMealCaloriesConsumed(mealType: string): number {
    const activity = this.todayActivity();
    if (!activity) return 0;
    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal?.items) return 0;
    
    return meal.items.reduce((total: number, item: any) => {
      // Only count calories from consumed items (consumed === true)
      if (item.calories && item.consumed === true) {
        return total + item.calories;
      }
      return total;
    }, 0);
  }

  getCaloriesBurned(): number {
    return this.todayActivity()?.caloriesBurned || 0;
  }

  getNetCalories(): number {
    return this.getCaloriesConsumed() - this.getCaloriesBurned();
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
    if (!meal?.items || meal.items.length === 0) return 'No items assigned';
    
    return meal.items.map((item: any) => {
      if (item.name && item.quantity && item.calories) {
        return `${item.name} ${item.quantity} (${item.calories} cal)`;
      } else if (item.name && item.calories) {
        return `${item.name} (${item.calories} cal)`;
      } else if (typeof item === 'string') {
        return item;
      } else {
        return item.name || 'Unknown';
      }
    }).join(', ');
  }

  getMealItemsList(mealType: string): any[] {
    const activity = this.todayActivity();
    if (!activity) return [];
    const meal = activity.meals[mealType as keyof typeof activity.meals];
    return meal?.items || [];
  }

  showCustomFoodInput = signal<{ [key: string]: boolean }>({});

  toggleCustomFoodInput(mealType: string): void {
    const current = this.showCustomFoodInput();
    this.showCustomFoodInput.set({
      ...current,
      [mealType]: !current[mealType]
    });
  }

  customFoodInputs = {
    breakfast: { name: '', quantity: '', calories: null as number | null },
    lunch: { name: '', quantity: '', calories: null as number | null },
    dinner: { name: '', quantity: '', calories: null as number | null },
    snacks: { name: '', quantity: '', calories: null as number | null }
  } as {
    breakfast: { name: string; quantity: string; calories: number | null };
    lunch: { name: string; quantity: string; calories: number | null };
    dinner: { name: string; quantity: string; calories: number | null };
    snacks: { name: string; quantity: string; calories: number | null };
  };

  addCustomFood(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks'): void {
    const input = this.customFoodInputs[mealType];
    if (!input.name.trim()) return;

    const activity = this.todayActivity();
    if (!activity) return;

    const meal = activity.meals[mealType];
    if (!meal) return;

    const newFood: any = {
      name: input.name.trim(),
      quantity: input.quantity.trim() || '1',
      calories: input.calories || 0,
      consumed: false,
      isPrescribed: false // Custom foods added by client are not prescribed
    };

    meal.items = [...(meal.items || []), newFood];
    
    // Reset input
    this.customFoodInputs[mealType] = { name: '', quantity: '', calories: null };
    this.showCustomFoodInput.set({
      ...this.showCustomFoodInput(),
      [mealType]: false
    });

    // Update calories consumed
    activity.caloriesConsumed = this.getCaloriesConsumed();
    this.saveActivity();
  }

  removeFoodItem(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', index: number): void {
    const activity = this.todayActivity();
    if (!activity) return;

    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal || !meal.items) return;

    const item = meal.items[index];
    // Only allow removal if it's not a prescribed item
    if (item.isPrescribed) {
      return; // Don't remove prescribed items
    }

    meal.items = meal.items.filter((_: any, i: number) => i !== index);
    
    // Update calories consumed
    activity.caloriesConsumed = this.getCaloriesConsumed();
    this.saveActivity();
  }

  toggleFoodConsumed(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', index: number): void {
    const activity = this.todayActivity();
    if (!activity) return;

    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal || !meal.items || !meal.items[index]) return;

    const item = meal.items[index];
    item.consumed = !item.consumed;
    
    // Update calories consumed (only count consumed items)
    activity.caloriesConsumed = this.getCaloriesConsumed();
    this.saveActivity();
  }

  isFoodConsumed(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', index: number): boolean {
    const activity = this.todayActivity();
    if (!activity) return false;
    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal || !meal.items || !meal.items[index]) return false;
    return meal.items[index].consumed || false;
  }

  isFoodPrescribed(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', index: number): boolean {
    const activity = this.todayActivity();
    if (!activity) return false;
    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal || !meal.items || !meal.items[index]) return false;
    return meal.items[index].isPrescribed || false;
  }

  getMealCalories(mealType: string): number {
    const activity = this.todayActivity();
    if (!activity) return 0;
    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal?.items) return 0;
    
    return meal.items.reduce((total: number, item: any) => {
      return total + (item.calories || 0);
    }, 0);
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

  toggleMeasurementForm(): void {
    this.showMeasurementForm.set(!this.showMeasurementForm());
    if (this.showMeasurementForm()) {
      this.isEditing.set(this.currentMeasurement() !== null);
    }
  }

  saveMeasurement(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const form = this.measurementForm;
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const measurement: MonthlyMeasurement = {
      userId: user.id,
      month: currentMonth,
      height: form.height || 0,
      weight: form.weight || 0,
      shoulder: form.shoulder || 0,
      chest: form.chest || 0,
      waist: form.waist || 0,
      belly: form.belly || 0,
      rightArm: form.rightArm || 0,
      leftArm: form.leftArm || 0,
      rightLeg: form.rightLeg || 0,
      leftLeg: form.leftLeg || 0,
      pushupCount: form.pushupCount || 0,
      pullupCount: form.pullupCount || 0
    };

    this.dataService.saveMonthlyMeasurement(measurement);
    this.loadMeasurements();
    this.showMeasurementForm.set(false);
    this.isEditing.set(false);
  }

  getGrowth(current: number, previous: number | null): { value: number; isPositive: boolean } | null {
    if (previous === null || previous === 0) return null;
    const diff = current - previous;
    return {
      value: Math.abs(diff),
      isPositive: diff > 0
    };
  }

  formatGrowth(growth: { value: number; isPositive: boolean } | null): string {
    if (!growth) return '';
    const sign = growth.isPositive ? '+' : '-';
    return `${sign}${growth.value.toFixed(1)}`;
  }

  getGrowthColor(growth: { value: number; isPositive: boolean } | null, isMuscle: boolean = false): string {
    if (!growth) return '';
    // For muscle measurements (shoulder, chest, arms, legs, pushups, pullups), increase is positive
    // For weight/waist/belly, decrease is positive
    if (isMuscle) {
      return growth.isPositive ? '#22c55e' : '#ef4444';
    } else {
      return growth.isPositive ? '#ef4444' : '#22c55e';
    }
  }

  getUserName(): string {
    const user = this.authService.currentUser();
    if (user?.fullName) {
      return user.fullName;
    }
    // Fallback to email if no full name
    return user?.email || 'User';
  }

  getInitials(): string {
    const user = this.authService.currentUser();
    if (user?.fullName) {
      const names = user.fullName.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return user.fullName.substring(0, 2).toUpperCase();
    }
    // Fallback to email initials
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  }
}

