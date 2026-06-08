import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService, DailyActivity, MonthlyMeasurement, FoodItem, DailyActivityWorkout } from '../../services/data.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss'
})
export class ClientDashboardComponent implements OnInit {
  // Navigation State
  // 'home' | 'meals' | 'workouts' | 'measurements'
  activeView = signal<'home' | 'meals' | 'workouts' | 'measurements'>('home');

  todayActivity = signal<DailyActivity | null>(null);
  dailyWeight = signal<number | null>(null);
  weightHistory = signal<{ date: string; weight: number }[]>([]);
  completionRate = signal(0);
  
  // Monthly Measurements
  currentMeasurement = signal<MonthlyMeasurement | null>(null);
  previousMeasurement = signal<MonthlyMeasurement | null>(null);
  showMeasurementForm = signal(false);
  isEditing = signal(false);

  // Food Swap Modal State
  activeSwapMeal = signal<string>('');
  activeSwapIndex = signal<number>(-1);
  activeSwapAlternatives = signal<string[]>([]);
  showSwapModal = signal<boolean>(false);
  
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

    // Initialize calorie progress fields
    if (!today.caloriesConsumed) {
      today.caloriesConsumed = this.getCaloriesConsumed();
    }
    if (!today.caloriesBurned) {
      today.caloriesBurned = 0;
    }

    // Initialize sleep, water, workouts list
    if (today.sleepHours === undefined) today.sleepHours = 0;
    if (today.waterIntake === undefined) today.waterIntake = 0;
    if (!today.cheatMeals) {
      today.cheatMeals = { fastFood: false, sweets: false, sugaryDrinks: false, snacking: false };
    }

    this.initializeTodayWorkouts();

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

  // ----------------------------------------------------
  // Workouts Initialization & Tracking
  // ----------------------------------------------------
  initializeTodayWorkouts(): void {
    const user = this.authService.currentUser();
    const activity = this.todayActivity();
    if (!user || !activity) return;

    // Load active workouts assigned by trainer for today
    if (!activity.todayWorkouts || activity.todayWorkouts.length === 0) {
      const plan = this.dataService.getWorkoutPlan(user.id);
      if (plan && plan.days) {
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const dayPlan = plan.days.find(d => d.dayName === todayName);
        if (dayPlan && dayPlan.workouts && dayPlan.workouts.length > 0) {
          activity.todayWorkouts = dayPlan.workouts.map(w => ({
            id: w.id,
            title: w.title,
            category: w.category || 'General',
            notes: w.notes || '',
            exercises: w.exercises.map(e => ({
              exerciseName: e.exerciseName,
              sets: e.sets,
              reps: e.reps,
              time: e.time,
              rest: e.rest,
              notes: e.notes,
              completed: false
            }))
          }));
        }
      }
    }
    this.saveActivity();
  }

  toggleExerciseDone(workoutIndex: number, exerciseIndex: number): void {
    const activity = this.todayActivity();
    if (!activity || !activity.todayWorkouts || !activity.todayWorkouts[workoutIndex]) return;

    const exercises = activity.todayWorkouts[workoutIndex].exercises;
    if (exercises && exercises[exerciseIndex]) {
      exercises[exerciseIndex].completed = !exercises[exerciseIndex].completed;
      this.saveActivity();
      this.calculateCompletionRate();
    }
  }

  getWorkoutsCompletedCount(): number {
    const workouts = this.todayActivity()?.todayWorkouts || [];
    return workouts.filter(w => w.exercises.length > 0 && w.exercises.every(e => e.completed)).length;
  }

  getWorkoutsTotalCount(): number {
    return this.todayActivity()?.todayWorkouts?.length || 0;
  }

  // ----------------------------------------------------
  // Quick Loggers: Steps, Sleep, Water
  // ----------------------------------------------------
  updateSteps(val: number): void {
    const activity = this.todayActivity();
    if (activity) {
      activity.workoutGoals.steps.completed = Math.max(0, val);
      activity.workoutGoals.steps.done = activity.workoutGoals.steps.completed >= activity.workoutGoals.steps.target;
      activity.caloriesBurned = this.calculateCaloriesBurned('steps', activity.workoutGoals.steps.completed);
      this.saveActivity();
      this.calculateCompletionRate();
    }
  }

  updateSleepHours(hours: number): void {
    const activity = this.todayActivity();
    if (activity) {
      activity.sleepHours = Math.max(0, Math.min(24, hours));
      this.saveActivity();
      this.calculateCompletionRate();
    }
  }

  updateWaterIntake(ml: number): void {
    const activity = this.todayActivity();
    if (activity) {
      activity.waterIntake = Math.max(0, ml);
      this.saveActivity();
      this.calculateCompletionRate();
    }
  }

  adjustWaterIntake(deltaMl: number): void {
    const activity = this.todayActivity();
    if (activity) {
      const current = activity.waterIntake || 0;
      this.updateWaterIntake(current + deltaMl);
    }
  }

  // ----------------------------------------------------
  // Cheat Meals Logic
  // ----------------------------------------------------
  toggleCheatMeal(type: 'fastFood' | 'sweets' | 'sugaryDrinks' | 'snacking'): void {
    const activity = this.todayActivity();
    if (activity) {
      if (!activity.cheatMeals) {
        activity.cheatMeals = { fastFood: false, sweets: false, sugaryDrinks: false, snacking: false };
      }
      activity.cheatMeals[type] = !activity.cheatMeals[type];
      activity.caloriesConsumed = this.getCaloriesConsumed();
      this.saveActivity();
      this.calculateCompletionRate();
    }
  }

  isCheatMealChecked(type: 'fastFood' | 'sweets' | 'sugaryDrinks' | 'snacking'): boolean {
    return this.todayActivity()?.cheatMeals?.[type] || false;
  }

  // ----------------------------------------------------
  // Food Swap Logic
  // ----------------------------------------------------
  getAlternativesForFood(foodName: string): string[] {
    const name = foodName.toLowerCase();
    if (name.includes('egg')) {
      return ['3 Egg Whites Scramble + 1 slice Toast', '100g Tofu scramble', '150g Plain Greek Yogurt', '1 scoop Whey Protein in Water'];
    }
    if (name.includes('rice') || name.includes('carb')) {
      return ['150g Cooked Quinoa', '120g Baked Sweet Potato', '100g Boiled Oats', '2 slices Whole Wheat Bread'];
    }
    if (name.includes('chicken') || name.includes('meat') || name.includes('fish') || name.includes('beef') || name.includes('breast')) {
      return ['120g Grilled Salmon', '150g Grilled Paneer', '150g Soya Chunks Curry', '150g Low Fat Cottage Cheese'];
    }
    if (name.includes('milk') || name.includes('shake')) {
      return ['250ml Soy Milk', '250ml Almond Milk', '250ml Coconut Water', 'Water with Lemon'];
    }
    if (name.includes('banana') || name.includes('apple') || name.includes('fruit')) {
      return ['100g Mixed Berries', '1 Medium Orange', '1 fresh Pear', '30g Unsalted Almonds'];
    }
    return ['150g Greek Yogurt', '100g Tofu Scramble', '120g Sweet Potato'];
  }

  openSwapDialog(mealType: string, index: number, event: Event): void {
    event.stopPropagation();
    const activity = this.todayActivity();
    if (!activity) return;

    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (meal && meal.items && meal.items[index]) {
      const foodItem = meal.items[index];
      this.activeSwapMeal.set(mealType);
      this.activeSwapIndex.set(index);
      this.activeSwapAlternatives.set(this.getAlternativesForFood(foodItem.name));
      this.showSwapModal.set(true);
    }
  }

  executeSwap(alternative: string): void {
    const mealType = this.activeSwapMeal();
    const index = this.activeSwapIndex();
    const activity = this.todayActivity();
    if (!activity || !mealType || index === -1) return;

    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (meal && meal.items && meal.items[index]) {
      const original = meal.items[index];
      meal.items[index] = {
        name: alternative + ` (Swap from ${original.name})`,
        quantity: '1 serving',
        calories: original.calories,
        consumed: false,
        isPrescribed: true
      };
      this.saveActivity();
      this.showSwapModal.set(false);
    }
  }

  // ----------------------------------------------------
  // Measurements Loading
  // ----------------------------------------------------
  loadMeasurements(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const current = this.dataService.getCurrentMonthMeasurement(user.id);
    const previous = this.dataService.getPreviousMonthMeasurement(user.id);
    
    this.currentMeasurement.set(current || null);
    this.previousMeasurement.set(previous || null);

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

  // ----------------------------------------------------
  // Calories and completion rate computes
  // ----------------------------------------------------
  updateWorkoutGoal(type: string, completed: number): void {
    const activity = this.todayActivity();
    if (!activity) return;

    const goal = activity.workoutGoals[type];
    if (goal) {
      goal.completed = completed;
      goal.done = completed >= goal.target;
      goal.caloriesBurned = this.calculateCaloriesBurned(type, goal.completed);
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
    const rates: { [key: string]: number } = {
      pushups: 0.5,
      steps: 0.04
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
    // Standard meals
    Object.values(activity.meals).forEach(meal => {
      if (meal.items) {
        meal.items.forEach((item: any) => {
          if (item.calories && item.consumed === true) {
            total += item.calories;
          }
        });
      }
    });

    // Cheat meals
    if (activity.cheatMeals) {
      if (activity.cheatMeals.fastFood) total += 800;
      if (activity.cheatMeals.sweets) total += 400;
      if (activity.cheatMeals.sugaryDrinks) total += 400;
      if (activity.cheatMeals.snacking) total += 320;
    }
    return total;
  }

  getMealCaloriesConsumed(mealType: string): number {
    const activity = this.todayActivity();
    if (!activity) return 0;
    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal?.items) return 0;
    
    return meal.items.reduce((total: number, item: any) => {
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
      // Mark all items in it as consumed if completing, or vice-versa
      if (meal.items) {
        meal.items.forEach(it => it.consumed = meal.completed);
      }
      activity.caloriesConsumed = this.getCaloriesConsumed();
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
      
      const newHistory = [
        ...this.weightHistory().filter(h => h.date !== activity.date),
        { date: activity.date, weight: this.dailyWeight()! }
      ].sort((a, b) => a.date.localeCompare(b.date));
      
      this.weightHistory.set(newHistory);
      this.dailyWeight.set(null);
    }
  }

  public saveActivity(): void {
    const user = this.authService.currentUser();
    const activity = this.todayActivity();
    if (user && activity) {
      this.dataService.saveDailyActivity(user.id, activity);
      this.todayActivity.set({ ...activity });
    }
  }

  public calculateCompletionRate(): void {
    const activity = this.todayActivity();
    if (!activity) {
      this.completionRate.set(0);
      return;
    }

    let totalPoints = 0;
    let earnedPoints = 0;

    // 1. Steps (1 pt)
    totalPoints += 1;
    const stepsGoal = activity.workoutGoals.steps;
    earnedPoints += Math.min(1, stepsGoal.completed / stepsGoal.target);

    // 2. Sleep hours (1 pt)
    totalPoints += 1;
    earnedPoints += Math.min(1, (activity.sleepHours || 0) / 8);

    // 3. Water intake (1 pt)
    totalPoints += 1;
    earnedPoints += Math.min(1, (activity.waterIntake || 0) / 2000);

    // 4. Meal logging (1 pt per meals listed)
    const mealKeys = ['breakfast', 'lunch', 'dinner', 'snacks'];
    mealKeys.forEach(mk => {
      const meal = activity.meals[mk as keyof typeof activity.meals];
      if (meal && meal.items && meal.items.length > 0) {
        totalPoints += 1;
        const consumed = meal.items.filter(it => it.consumed).length;
        earnedPoints += (consumed / meal.items.length);
      }
    });

    // 5. Workouts/Exercises (2 pts)
    const workouts = activity.todayWorkouts || [];
    let totalExercises = 0;
    let completedExercises = 0;
    workouts.forEach(w => {
      totalExercises += w.exercises.length;
      completedExercises += w.exercises.filter(e => e.completed).length;
    });

    if (totalExercises > 0) {
      totalPoints += 2;
      earnedPoints += 2 * (completedExercises / totalExercises);
    }

    const rate = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    this.completionRate.set(rate);
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
    if (!activity) return 'No items prescribed';
    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal?.items || meal.items.length === 0) return 'No items prescribed';
    
    return meal.items.map((item: any) => {
      return item.name + (item.quantity ? ` (${item.quantity})` : '');
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
      quantity: input.quantity.trim() || '1 serving',
      calories: input.calories || 0,
      consumed: true,
      isPrescribed: false
    };

    meal.items = [...(meal.items || []), newFood];
    
    // Reset inputs
    this.customFoodInputs[mealType] = { name: '', quantity: '', calories: null };
    this.showCustomFoodInput.set({
      ...this.showCustomFoodInput(),
      [mealType]: false
    });

    activity.caloriesConsumed = this.getCaloriesConsumed();
    this.saveActivity();
    this.calculateCompletionRate();
  }

  removeFoodItem(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', index: number): void {
    const activity = this.todayActivity();
    if (!activity) return;

    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal || !meal.items) return;

    const item = meal.items[index];
    if (item.isPrescribed) return; // Cannot delete prescribed foods

    meal.items = meal.items.filter((_: any, i: number) => i !== index);
    
    activity.caloriesConsumed = this.getCaloriesConsumed();
    this.saveActivity();
    this.calculateCompletionRate();
  }

  toggleFoodConsumed(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', index: number): void {
    const activity = this.todayActivity();
    if (!activity) return;

    const meal = activity.meals[mealType as keyof typeof activity.meals];
    if (!meal || !meal.items || !meal.items[index]) return;

    const item = meal.items[index];
    item.consumed = !item.consumed;
    
    activity.caloriesConsumed = this.getCaloriesConsumed();
    this.saveActivity();
    this.calculateCompletionRate();
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
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  }

  // ----------------------------------------------------
  // SVG Chart Geometry Calculators (Premium Visuals)
  // ----------------------------------------------------
  getWeightChartBars(): { x: number; y: number; height: number; width: number; date: string; weight: number }[] {
    const history = this.weightHistory();
    if (history.length === 0) return [];
    
    // Take the last 5 logs
    const data = history.slice(-5);
    const weights = data.map(d => d.weight);
    
    const maxWeight = Math.max(...weights, 75);
    const minWeight = Math.min(...weights, 40) - 2;
    const range = maxWeight - minWeight;

    const chartWidth = 320;
    const chartHeight = 130;
    const barWidth = 32;
    const gap = (chartWidth - (barWidth * data.length)) / (data.length + 1);

    return data.map((d, idx) => {
      const barHeight = range > 0 ? ((d.weight - minWeight) / range) * chartHeight : chartHeight;
      const x = gap + idx * (barWidth + gap);
      const y = chartHeight - barHeight;
      return {
        x,
        y: y + 10,
        height: Math.max(5, barHeight),
        width: barWidth,
        date: d.date.substring(5), // "MM-DD"
        weight: d.weight
      };
    });
  }

  // For Doughnut Progress ring coordinates
  getDonutStrokeDashArray(radius: number): string {
    const circumference = 2 * Math.PI * radius;
    return `${circumference} ${circumference}`;
  }

  getDonutStrokeDashOffset(percent: number, radius: number): number {
    const circumference = 2 * Math.PI * radius;
    const p = Math.max(0, Math.min(100, percent));
    return circumference - (p / 100) * circumference;
  }
}
