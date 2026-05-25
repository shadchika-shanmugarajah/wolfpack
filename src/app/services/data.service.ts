import { Injectable, signal } from '@angular/core';

export interface ClientProfile {
  userId: string;
  weight: number;
  height: number;
  bmi: number;
  allergies: string[];
  medicalConditions: string;
  foodPreferences: string;
  pastInjuries?: string;
  fitnessGoal?: string;
  workoutLocation?: string;
}

export interface DailyActivity {
  date: string;
  workoutGoals: {
    pushups: { target: number; completed: number; done: boolean; caloriesBurned?: number };
    steps: { target: number; completed: number; done: boolean; caloriesBurned?: number };
    [key: string]: any;
  };
  meals: {
    breakfast: { items: FoodItem[]; completed: boolean };
    lunch: { items: FoodItem[]; completed: boolean };
    dinner: { items: FoodItem[]; completed: boolean };
    snacks: { items: FoodItem[]; completed: boolean };
    shake?: { items: FoodItem[]; completed: boolean };
  };
  weight?: number;
  caloriesConsumed?: number;
  caloriesBurned?: number;
}

export interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  consumed?: boolean; // Track if client consumed this item
  isPrescribed?: boolean; // Track if this is from trainer's plan (not removable)
}

export interface DietPlan {
  userId: string;
  breakfast: FoodItem[];
  lunch: FoodItem[];
  dinner: FoodItem[];
  snacks: FoodItem[];
  shake?: FoodItem[];
}

export interface WorkoutPlan {
  userId: string;
  exercises?: {
    name: string;
    reps: number;
    sets: number;
    frequency: 'daily' | 'weekly';
  }[];
  stepsTarget: number;
  days?: DayWorkout[];
}

export interface DayWorkout {
  dayName: string;
  workoutTitle: string;
  category: string;
  notes: string;
  exercises: Exercise[];
}

export interface Exercise {
  exerciseName: string;
  sets: number;
  reps: number;
  time: string;
  rest: string;
  notes: string;
  isCollapsed?: boolean;
}

export interface MonthlyMeasurement {
  userId: string;
  month: string; // Format: "YYYY-MM" (e.g., "2024-01")
  // Starting Point Stats
  height: number;
  weight: number;
  // Body Blueprint (cm)
  shoulder: number;
  chest: number;
  waist: number;
  belly: number;
  rightArm: number;
  leftArm: number;
  rightLeg: number;
  leftLeg: number;
  // Power Tests
  pushupCount: number;
  pullupCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private clientProfiles: Map<string, ClientProfile> = new Map();
  private dailyActivities: Map<string, DailyActivity[]> = new Map();
  private dietPlans: Map<string, DietPlan> = new Map();
  private workoutPlans: Map<string, WorkoutPlan> = new Map();
  private monthlyMeasurements: Map<string, MonthlyMeasurement[]> = new Map();

  saveClientProfile(profile: ClientProfile): void {
    this.clientProfiles.set(profile.userId, profile);
    localStorage.setItem('clientProfiles', JSON.stringify(Array.from(this.clientProfiles.entries())));
  }

  getClientProfile(userId: string): ClientProfile | undefined {
    return this.clientProfiles.get(userId);
  }

  saveDailyActivity(userId: string, activity: DailyActivity): void {
    const activities = this.dailyActivities.get(userId) || [];
    const existingIndex = activities.findIndex(a => a.date === activity.date);
    if (existingIndex !== -1) {
      activities[existingIndex] = activity;
    } else {
      activities.push(activity);
    }
    this.dailyActivities.set(userId, activities);
    localStorage.setItem('dailyActivities', JSON.stringify(Array.from(this.dailyActivities.entries())));
  }

  getDailyActivities(userId: string): DailyActivity[] {
    return this.dailyActivities.get(userId) || [];
  }

  getTodayActivity(userId: string): DailyActivity {
    const today = new Date().toISOString().split('T')[0];
    const activities = this.dailyActivities.get(userId) || [];
    const existing = activities.find(a => a.date === today);
    if (existing) {
      // Ensure diet plan items are marked as prescribed
      const dietPlan = this.getDietPlan(userId);
      if (dietPlan) {
        const markAsPrescribed = (items: FoodItem[], planItems: FoodItem[]) => {
          return items.map(item => {
            // Check if this item exists in the diet plan
            const isInPlan = planItems.some(planItem => 
              planItem.name === item.name && 
              planItem.quantity === item.quantity &&
              planItem.calories === item.calories
            );
            return {
              ...item,
              isPrescribed: isInPlan ? true : (item.isPrescribed || false),
              consumed: item.consumed !== undefined ? item.consumed : false
            };
          });
        };
        
        existing.meals.breakfast.items = markAsPrescribed(existing.meals.breakfast.items, dietPlan.breakfast);
        existing.meals.lunch.items = markAsPrescribed(existing.meals.lunch.items, dietPlan.lunch);
        existing.meals.dinner.items = markAsPrescribed(existing.meals.dinner.items, dietPlan.dinner);
        existing.meals.snacks.items = markAsPrescribed(existing.meals.snacks.items, dietPlan.snacks);
        if (dietPlan.shake) {
          existing.meals.shake = {
            items: markAsPrescribed(existing.meals.shake?.items || [], dietPlan.shake),
            completed: existing.meals.shake?.completed || false
          };
        }
      }
      return existing;
    }
    
    // Get diet plan to populate meal items
    const dietPlan = this.getDietPlan(userId);
    const markAsPrescribed = (items: FoodItem[]) => {
      return items.map(item => ({
        ...item,
        isPrescribed: true,
        consumed: false
      }));
    };
    
    return {
      date: today,
      workoutGoals: {
        pushups: { target: 100, completed: 0, done: false, caloriesBurned: 0 },
        steps: { target: 10000, completed: 0, done: false, caloriesBurned: 0 }
      },
      meals: {
        breakfast: { items: markAsPrescribed(dietPlan?.breakfast || []), completed: false },
        lunch: { items: markAsPrescribed(dietPlan?.lunch || []), completed: false },
        dinner: { items: markAsPrescribed(dietPlan?.dinner || []), completed: false },
        snacks: { items: markAsPrescribed(dietPlan?.snacks || []), completed: false },
        shake: { items: markAsPrescribed(dietPlan?.shake || []), completed: false }
      },
      caloriesConsumed: 0,
      caloriesBurned: 0
    };
  }

  saveDietPlan(plan: DietPlan): void {
    this.dietPlans.set(plan.userId, plan);
    localStorage.setItem('dietPlans', JSON.stringify(Array.from(this.dietPlans.entries())));
  }

  getDietPlan(userId: string): DietPlan | undefined {
    return this.dietPlans.get(userId);
  }

  saveWorkoutPlan(plan: WorkoutPlan): void {
    this.workoutPlans.set(plan.userId, plan);
    localStorage.setItem('workoutPlans', JSON.stringify(Array.from(this.workoutPlans.entries())));
  }

  getWorkoutPlan(userId: string): WorkoutPlan | undefined {
    return this.workoutPlans.get(userId);
  }

  saveMonthlyMeasurement(measurement: MonthlyMeasurement): void {
    const measurements = this.monthlyMeasurements.get(measurement.userId) || [];
    const existingIndex = measurements.findIndex(m => m.month === measurement.month);
    if (existingIndex !== -1) {
      measurements[existingIndex] = measurement;
    } else {
      measurements.push(measurement);
    }
    // Sort by month (newest first)
    measurements.sort((a, b) => b.month.localeCompare(a.month));
    this.monthlyMeasurements.set(measurement.userId, measurements);
    localStorage.setItem('monthlyMeasurements', JSON.stringify(Array.from(this.monthlyMeasurements.entries())));
  }

  getMonthlyMeasurements(userId: string): MonthlyMeasurement[] {
    return this.monthlyMeasurements.get(userId) || [];
  }

  getCurrentMonthMeasurement(userId: string): MonthlyMeasurement | undefined {
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const measurements = this.getMonthlyMeasurements(userId);
    return measurements.find(m => m.month === currentMonth);
  }

  getPreviousMonthMeasurement(userId: string): MonthlyMeasurement | undefined {
    const measurements = this.getMonthlyMeasurements(userId);
    if (measurements.length < 2) return undefined;
    return measurements[1]; // Second item (after current month)
  }

  loadFromStorage(): void {
    const profiles = localStorage.getItem('clientProfiles');
    if (profiles) {
      this.clientProfiles = new Map(JSON.parse(profiles));
    }
    const activities = localStorage.getItem('dailyActivities');
    if (activities) {
      this.dailyActivities = new Map(JSON.parse(activities));
    }
    const diets = localStorage.getItem('dietPlans');
    if (diets) {
      this.dietPlans = new Map(JSON.parse(diets));
    }
    const workouts = localStorage.getItem('workoutPlans');
    if (workouts) {
      this.workoutPlans = new Map(JSON.parse(workouts));
    }
    const measurements = localStorage.getItem('monthlyMeasurements');
    if (measurements) {
      this.monthlyMeasurements = new Map(JSON.parse(measurements));
    }
  }

  constructor() {
    this.loadFromStorage();

    // Seed Varun's profile for testing
    if (!this.clientProfiles.has('varun')) {
      this.clientProfiles.set('varun', {
        userId: 'varun',
        weight: 58,
        height: 170,
        bmi: 20.1,
        allergies: [],
        medicalConditions: 'None',
        foodPreferences: 'Non-Vegetarian',
        workoutLocation: 'Gym'
      });
      localStorage.setItem('clientProfiles', JSON.stringify(Array.from(this.clientProfiles.entries())));
    }
  }
}


