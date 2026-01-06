import { Injectable, signal } from '@angular/core';

export interface ClientProfile {
  userId: string;
  weight: number;
  height: number;
  bmi: number;
  allergies: string[];
  medicalConditions: string;
  foodPreferences: string;
}

export interface DailyActivity {
  date: string;
  workoutGoals: {
    pushups: { target: number; completed: number; done: boolean };
    steps: { target: number; completed: number; done: boolean };
    [key: string]: any;
  };
  meals: {
    breakfast: { items: string[]; completed: boolean };
    lunch: { items: string[]; completed: boolean };
    dinner: { items: string[]; completed: boolean };
    snacks: { items: string[]; completed: boolean };
  };
  weight?: number;
}

export interface DietPlan {
  userId: string;
  breakfast: string[];
  lunch: string[];
  dinner: string[];
  snacks: string[];
}

export interface WorkoutPlan {
  userId: string;
  exercises: {
    name: string;
    reps: number;
    sets: number;
    frequency: 'daily' | 'weekly';
  }[];
  stepsTarget: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private clientProfiles: Map<string, ClientProfile> = new Map();
  private dailyActivities: Map<string, DailyActivity[]> = new Map();
  private dietPlans: Map<string, DietPlan> = new Map();
  private workoutPlans: Map<string, WorkoutPlan> = new Map();

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
    return activities.find(a => a.date === today) || {
      date: today,
      workoutGoals: {
        pushups: { target: 100, completed: 0, done: false },
        steps: { target: 10000, completed: 0, done: false }
      },
      meals: {
        breakfast: { items: [], completed: false },
        lunch: { items: [], completed: false },
        dinner: { items: [], completed: false },
        snacks: { items: [], completed: false }
      }
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
  }

  constructor() {
    this.loadFromStorage();
  }
}

