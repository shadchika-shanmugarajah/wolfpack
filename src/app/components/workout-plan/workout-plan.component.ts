import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-workout-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './workout-plan.component.html',
  styleUrl: './workout-plan.component.scss'
})
export class WorkoutPlanComponent implements OnInit {
  userId = signal<string>('');
  clientEmail = signal<string>('');
  exercises = signal<{ name: string; reps: number; sets: number; frequency: 'daily' | 'weekly' }[]>([]);
  stepsTarget = signal(10000);
  newExerciseName = signal('');
  newExerciseReps = signal(10);
  newExerciseSets = signal(3);
  newExerciseFrequency = signal<'daily' | 'weekly'>('daily');

  commonExercises = [
    'Push-ups', 'Sit-ups', 'Squats', 'Planks', 'Burpees', 
    'Jumping Jacks', 'Lunges', 'Mountain Climbers', 'Pull-ups'
  ];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
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

      const existingPlan = this.dataService.getWorkoutPlan(userId);
      if (existingPlan) {
        this.exercises.set(existingPlan.exercises);
        this.stepsTarget.set(existingPlan.stepsTarget);
      }
    }
  }

  isExerciseAdded(exerciseName: string): boolean {
    return this.exercises().some((e: any) => e.name === exerciseName);
  }

  addExercise(name: string): void {
    const exercise = {
      name,
      reps: 10,
      sets: 3,
      frequency: 'daily' as 'daily' | 'weekly'
    };
    this.exercises.set([...this.exercises(), exercise]);
  }

  addCustomExercise(): void {
    const name = this.newExerciseName().trim();
    if (name) {
      const exercise = {
        name,
        reps: this.newExerciseReps(),
        sets: this.newExerciseSets(),
        frequency: this.newExerciseFrequency()
      };
      this.exercises.set([...this.exercises(), exercise]);
      this.newExerciseName.set('');
      this.newExerciseReps.set(10);
      this.newExerciseSets.set(3);
      this.newExerciseFrequency.set('daily');
    }
  }

  removeExercise(index: number): void {
    const current = this.exercises();
    this.exercises.set(current.filter((_: any, i: number) => i !== index));
  }

  updateExercise(index: number, field: string, value: any): void {
    const current = this.exercises();
    current[index] = { ...current[index], [field]: value };
    this.exercises.set([...current]);
  }

  savePlan(): void {
    if (!this.userId()) return;

    const plan = {
      userId: this.userId()!,
      exercises: this.exercises(),
      stepsTarget: this.stepsTarget()
    };

    this.dataService.saveWorkoutPlan(plan);

    // Update today's activity with workout goals
    const today = new Date().toISOString().split('T')[0];
    const activity = this.dataService.getTodayActivity(this.userId()!);
    
    // Set pushups target from exercises if available
    const pushupsExercise = this.exercises().find((e: any) => e.name.toLowerCase().includes('push'));
    if (pushupsExercise) {
      activity.workoutGoals.pushups.target = pushupsExercise.reps * pushupsExercise.sets;
    }
    activity.workoutGoals.steps.target = this.stepsTarget();
    
    this.dataService.saveDailyActivity(this.userId()!, activity);

    this.router.navigate(['/admin/dashboard']);
  }
}

