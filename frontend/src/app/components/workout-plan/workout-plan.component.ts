import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DataService, Exercise, DayWorkout, AssignedWorkout } from '../../services/data.service';

export interface WorkoutFolder {
  folderId: string;
  folderName: string;
}

export interface WorkoutTemplate {
  templateId: string;
  folderId: string; // linked to folder
  title: string;
  exercises: Exercise[];
  notes?: string;
}

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
  stepsTarget = signal(10000);

  // 7 Days Weekly Plan
  days = signal<DayWorkout[]>([
    { dayName: 'Monday', workouts: [] },
    { dayName: 'Tuesday', workouts: [] },
    { dayName: 'Wednesday', workouts: [] },
    { dayName: 'Thursday', workouts: [] },
    { dayName: 'Friday', workouts: [] },
    { dayName: 'Saturday', workouts: [] },
    { dayName: 'Sunday', workouts: [] }
  ]);

  // Selected Day for Focused Actions / UI Highlighting
  selectedDayIndex = signal<number>(0);

  // Library State
  folders = signal<WorkoutFolder[]>([]);
  templates = signal<WorkoutTemplate[]>([]);

  // Folder Controls
  newFolderName = signal('');
  editingFolderId = signal<string | null>(null);
  editingFolderName = signal<string>('');

  // Selected Folder for filtering templates list
  // "" = All Templates, "unorganized" = Templates without folders
  selectedFolderId = signal<string>('');

  // Search Filter
  searchQuery = signal<string>('');

  // Editor Modal / Drawer State
  activeDayIndex = signal<number | null>(null);
  activeWorkoutIndex = signal<number | null>(null);
  activeWorkout = signal<AssignedWorkout | null>(null);
  isEditingLibraryTemplate = signal<boolean>(false);
  activeLibraryTemplateId = signal<string | null>(null);
  activeLibraryTemplateFolderId = signal<string>('');

  // Day duplication target selection
  targetDuplicateDay = signal<string>('');

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

      // Load existing plan
      const existingPlan = this.dataService.getWorkoutPlan(userId);
      if (existingPlan) {
        this.stepsTarget.set(existingPlan.stepsTarget);
        if (existingPlan.days) {
          const mappedDays = existingPlan.days.map(d => {
            const workouts = d.workouts || [];
            
            // Backward compatibility / Migration:
            // Convert single day-workout elements to the array structure
            if (workouts.length === 0 && d.exercises && d.exercises.length > 0) {
              workouts.push({
                id: 'legacy-' + Date.now() + '-' + Math.round(Math.random() * 1000),
                title: d.workoutTitle || 'Assigned Workout',
                category: d.category || 'General',
                notes: d.notes || '',
                exercises: d.exercises.map((e: any) => ({
                  exerciseName: e.exerciseName || e.name || '',
                  sets: e.sets || 3,
                  reps: e.reps || 10,
                  time: e.time || 'N/A',
                  rest: e.rest || '60s',
                  notes: e.notes || '',
                  isCollapsed: e.isCollapsed ?? false
                }))
              });
            }
            return {
              dayName: d.dayName,
              workouts: workouts
            };
          });
          this.days.set(mappedDays);
        } else if (existingPlan.exercises && existingPlan.exercises.length > 0) {
          // Migration from very old single exercise-list layout
          const mappedDays = this.days().map((d, i) => {
            if (i === 0) {
              return {
                dayName: 'Monday',
                workouts: [{
                  id: 'legacy-' + Date.now() + '-0',
                  title: 'Daily Exercises',
                  category: 'Strength',
                  notes: 'Legacy workout plan',
                  exercises: existingPlan.exercises!.map((e: any) => ({
                    exerciseName: e.name || '',
                    sets: e.sets || 3,
                    reps: e.reps || 10,
                    time: 'N/A',
                    rest: '60s',
                    notes: `Frequency: ${e.frequency || 'daily'}`,
                    isCollapsed: false
                  }))
                }]
              };
            }
            return d;
          });
          this.days.set(mappedDays);
        }
      }
    }

    // Set default duplicate target
    const target = this.days().find((_, i) => i !== this.selectedDayIndex())?.dayName || '';
    this.targetDuplicateDay.set(target);

    // Load templates library
    this.loadLibrary();
  }

  // ----------------------------------------------------
  // Library Storage & Management
  // ----------------------------------------------------
  loadLibrary(): void {
    const storedFolders = localStorage.getItem('workoutFolders');
    const storedTemplates = localStorage.getItem('workoutTemplates');

    if (storedFolders) {
      this.folders.set(JSON.parse(storedFolders));
    }
    if (storedTemplates) {
      this.templates.set(JSON.parse(storedTemplates));
    }

    // Seed default folders and templates if none exist
    if (!storedFolders || this.folders().length === 0) {
      const demoFolders: WorkoutFolder[] = [
        { folderId: 'f1', folderName: 'Cardio Exercises' },
        { folderId: 'f2', folderName: 'Push Day Split' },
        { folderId: 'f3', folderName: 'Pull Day Split' },
        { folderId: 'f4', folderName: 'Leg Day' },
        { folderId: 'f5', folderName: 'HIIT' },
        { folderId: 'f6', folderName: 'Fat Loss' }
      ];
      this.folders.set(demoFolders);

      if (!storedTemplates || this.templates().length === 0) {
        const demoTemplates: WorkoutTemplate[] = [
          {
            templateId: 't1',
            folderId: 'f2', // Push Day Split
            title: 'Beginner Push',
            notes: 'Rest 90 seconds between sets.',
            exercises: [
              { exerciseName: 'Barbell Bench Press', sets: 3, reps: 10, time: 'N/A', rest: '90s', notes: 'Keep form strict' },
              { exerciseName: 'Dumbbell Overhead Press', sets: 3, reps: 10, time: 'N/A', rest: '90s', notes: 'Full extension' },
              { exerciseName: 'Lying Tricep Extensions', sets: 3, reps: 12, time: 'N/A', rest: '60s', notes: 'Slow negatives' }
            ]
          },
          {
            templateId: 't2',
            folderId: 'f2', // Push Day Split
            title: 'Intermediate Push',
            notes: 'Warm-up sets first.',
            exercises: [
              { exerciseName: 'Incline Dumbbell Press', sets: 4, reps: 8, time: 'N/A', rest: '90s', notes: '45-degree angle' },
              { exerciseName: 'Overhead Press', sets: 4, reps: 8, time: 'N/A', rest: '90s', notes: 'Engage core' },
              { exerciseName: 'Cable Chest Flys', sets: 3, reps: 12, time: 'N/A', rest: '60s', notes: 'Peak contraction' },
              { exerciseName: 'Tricep Rope Pushdowns', sets: 3, reps: 12, time: 'N/A', rest: '60s', notes: 'Squeeze at bottom' }
            ]
          },
          {
            templateId: 't3',
            folderId: 'f3', // Pull Day Split
            title: 'Beginner Pull',
            notes: 'Warm up properly.',
            exercises: [
              { exerciseName: 'Lat Pulldowns', sets: 3, reps: 10, time: 'N/A', rest: '90s', notes: 'Squeeze shoulder blades' },
              { exerciseName: 'Seated Cable Rows', sets: 3, reps: 10, time: 'N/A', rest: '90s', notes: 'Keep back straight' },
              { exerciseName: 'Dumbbell Hammer Curls', sets: 3, reps: 12, time: 'N/A', rest: '60s', notes: 'Controlled release' }
            ]
          },
          {
            templateId: 't4',
            folderId: 'f1', // Cardio Exercises
            title: 'Beginner Cardio',
            notes: 'Easy pace cardio split.',
            exercises: [
              { exerciseName: 'Treadmill Jog', sets: 1, reps: 1, time: '20 mins', rest: 'N/A', notes: 'Steady state pace' },
              { exerciseName: 'Stationary Bike', sets: 1, reps: 1, time: '15 mins', rest: 'N/A', notes: 'Moderate resistance' }
            ]
          }
        ];
        this.templates.set(demoTemplates);
      }
      this.saveLibrary();
    }
  }

  saveLibrary(): void {
    localStorage.setItem('workoutFolders', JSON.stringify(this.folders()));
    localStorage.setItem('workoutTemplates', JSON.stringify(this.templates()));
  }

  // ----------------------------------------------------
  // Folder CRUD
  // ----------------------------------------------------
  createFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) return;
    const newFolder: WorkoutFolder = {
      folderId: 'fld-' + Date.now(),
      folderName: name
    };
    this.folders.set([...this.folders(), newFolder]);
    this.newFolderName.set('');
    this.saveLibrary();
  }

  startRenameFolder(folder: WorkoutFolder, event: Event): void {
    event.stopPropagation();
    this.editingFolderId.set(folder.folderId);
    this.editingFolderName.set(folder.folderName);
  }

  saveRenameFolder(event: Event): void {
    event.stopPropagation();
    const id = this.editingFolderId();
    const name = this.editingFolderName().trim();
    if (!id || !name) return;

    this.folders.set(this.folders().map(f => f.folderId === id ? { ...f, folderName: name } : f));
    this.editingFolderId.set(null);
    this.saveLibrary();
  }

  deleteFolder(folderId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this folder? Workout templates inside will be moved to Unorganized.')) {
      this.folders.set(this.folders().filter(f => f.folderId !== folderId));
      this.templates.set(this.templates().map(t => t.folderId === folderId ? { ...t, folderId: '' } : t));
      if (this.selectedFolderId() === folderId) {
        this.selectedFolderId.set(''); // Go back to All
      }
      this.saveLibrary();
    }
  }

  selectFolder(folderId: string): void {
    this.selectedFolderId.set(folderId);
  }

  // ----------------------------------------------------
  // Template CRUD (Library)
  // ----------------------------------------------------
  getFilteredTemplates(): WorkoutTemplate[] {
    const folderId = this.selectedFolderId();
    const query = this.searchQuery().toLowerCase().trim();

    return this.templates().filter(t => {
      const matchesFolder =
        folderId === '' ||
        (folderId === 'unorganized' && !t.folderId) ||
        t.folderId === folderId;

      const matchesSearch =
        !query ||
        t.title.toLowerCase().includes(query) ||
        t.exercises.some(e => e.exerciseName.toLowerCase().includes(query));

      return matchesFolder && matchesSearch;
    });
  }

  createTemplate(): void {
    this.isEditingLibraryTemplate.set(true);
    this.activeLibraryTemplateId.set(null);
    this.activeLibraryTemplateFolderId.set(
      this.selectedFolderId() !== 'unorganized' ? this.selectedFolderId() : ''
    );
    this.activeWorkout.set({
      id: '',
      title: '',
      category: '',
      notes: '',
      exercises: []
    });
    this.activeDayIndex.set(null);
    this.activeWorkoutIndex.set(null);
  }

  startEditTemplate(temp: WorkoutTemplate, event: Event): void {
    event.stopPropagation();
    this.isEditingLibraryTemplate.set(true);
    this.activeLibraryTemplateId.set(temp.templateId);
    this.activeLibraryTemplateFolderId.set(temp.folderId || '');
    this.activeWorkout.set({
      id: temp.templateId,
      title: temp.title,
      category: '',
      notes: temp.notes || '',
      exercises: temp.exercises.map(e => ({ ...e, isCollapsed: e.isCollapsed ?? false }))
    });
    this.activeDayIndex.set(null);
    this.activeWorkoutIndex.set(null);
  }

  deleteTemplate(templateId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Delete this template permanently from library?')) {
      this.templates.set(this.templates().filter(t => t.templateId !== templateId));
      this.saveLibrary();
    }
  }

  // ----------------------------------------------------
  // Assignment Operations (Mon-Sun Schedule)
  // ----------------------------------------------------
  assignTemplateToDay(temp: WorkoutTemplate, dayIndex: number): void {
    const list = [...this.days()];
    const day = list[dayIndex];
    if (!day.workouts) {
      day.workouts = [];
    }

    const newAssignment: AssignedWorkout = {
      id: 'asg-' + Date.now() + '-' + Math.round(Math.random() * 1000),
      templateId: temp.templateId,
      title: temp.title,
      notes: temp.notes || '',
      exercises: temp.exercises.map(e => ({ ...e, isCollapsed: false }))
    };

    day.workouts.push(newAssignment);
    this.days.set(list);
  }

  removeAssignment(dayIndex: number, workoutId: string, event: Event): void {
    event.stopPropagation();
    const list = [...this.days()];
    const day = list[dayIndex];
    if (day.workouts) {
      day.workouts = day.workouts.filter(w => w.id !== workoutId);
      this.days.set(list);
    }
  }

  startEditAssignment(dayIndex: number, workoutIndex: number, event: Event): void {
    event.stopPropagation();
    const list = this.days();
    const day = list[dayIndex];
    if (!day.workouts || !day.workouts[workoutIndex]) return;

    const workout = day.workouts[workoutIndex];
    this.isEditingLibraryTemplate.set(false);
    this.activeDayIndex.set(dayIndex);
    this.activeWorkoutIndex.set(workoutIndex);
    this.activeWorkout.set({
      id: workout.id,
      templateId: workout.templateId,
      title: workout.title,
      category: workout.category || '',
      notes: workout.notes || '',
      exercises: workout.exercises.map(e => ({ ...e, isCollapsed: e.isCollapsed ?? false }))
    });
  }

  addCustomWorkoutToDay(dayIndex: number): void {
    const list = [...this.days()];
    const day = list[dayIndex];
    if (!day.workouts) day.workouts = [];

    const newAssignment: AssignedWorkout = {
      id: 'asg-' + Date.now() + '-' + Math.round(Math.random() * 1000),
      title: 'Custom Workout',
      notes: '',
      exercises: []
    };

    day.workouts.push(newAssignment);
    this.days.set(list);

    // Immediately open in editor
    this.startEditAssignment(dayIndex, day.workouts.length - 1, { stopPropagation: () => {} } as Event);
  }

  // ----------------------------------------------------
  // Editor Drawer Actions
  // ----------------------------------------------------
  closeEditor(): void {
    this.activeWorkout.set(null);
    this.activeDayIndex.set(null);
    this.activeWorkoutIndex.set(null);
    this.activeLibraryTemplateId.set(null);
  }

  saveActiveWorkout(): void {
    const active = this.activeWorkout();
    if (!active) return;

    const title = active.title.trim() || 'Untitled Workout';

    if (this.isEditingLibraryTemplate()) {
      const templateId = this.activeLibraryTemplateId();
      if (templateId) {
        // Edit existing library template
        this.templates.set(
          this.templates().map(t =>
            t.templateId === templateId
              ? {
                  ...t,
                  folderId: this.activeLibraryTemplateFolderId(),
                  title: title,
                  notes: active.notes,
                  exercises: active.exercises.map(e => ({ ...e }))
                }
              : t
          )
        );
      } else {
        // Create new library template
        const newTemp: WorkoutTemplate = {
          templateId: 'tmp-' + Date.now(),
          folderId: this.activeLibraryTemplateFolderId(),
          title: title,
          notes: active.notes,
          exercises: active.exercises.map(e => ({ ...e }))
        };
        this.templates.set([...this.templates(), newTemp]);
      }
      this.saveLibrary();
    } else {
      // Edit day assignment instance
      const dayIdx = this.activeDayIndex();
      const wIdx = this.activeWorkoutIndex();

      if (dayIdx !== null && wIdx !== null) {
        const list = [...this.days()];
        const day = list[dayIdx];
        if (day.workouts && day.workouts[wIdx]) {
          day.workouts[wIdx] = {
            ...day.workouts[wIdx],
            title: title,
            notes: active.notes,
            category: active.category,
            exercises: active.exercises.map(e => ({ ...e }))
          };
          this.days.set(list);
        }
      }
    }

    this.closeEditor();
  }

  // ----------------------------------------------------
  // Exercise CRUD inside Editor Drawer
  // ----------------------------------------------------
  addExerciseToActive(): void {
    const active = this.activeWorkout();
    if (!active) return;

    const newEx: Exercise = {
      exerciseName: '',
      sets: 3,
      reps: 10,
      time: 'N/A',
      rest: '60s',
      notes: '',
      isCollapsed: false
    };

    active.exercises.push(newEx);
    this.activeWorkout.set({ ...active });
  }

  removeExerciseFromActive(index: number): void {
    const active = this.activeWorkout();
    if (!active) return;

    active.exercises = active.exercises.filter((_, i) => i !== index);
    this.activeWorkout.set({ ...active });
  }

  duplicateExerciseInActive(index: number): void {
    const active = this.activeWorkout();
    if (!active) return;

    const source = active.exercises[index];
    const copy: Exercise = {
      ...source,
      exerciseName: source.exerciseName ? `${source.exerciseName} (Copy)` : '',
      isCollapsed: false
    };

    active.exercises.splice(index + 1, 0, copy);
    this.activeWorkout.set({ ...active });
  }

  moveExercise(index: number, direction: 'up' | 'down'): void {
    const active = this.activeWorkout();
    if (!active) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= active.exercises.length) return;

    const temp = active.exercises[index];
    active.exercises[index] = active.exercises[targetIndex];
    active.exercises[targetIndex] = temp;
    this.activeWorkout.set({ ...active });
  }

  toggleCollapseExercise(index: number): void {
    const active = this.activeWorkout();
    if (!active) return;
    active.exercises[index].isCollapsed = !active.exercises[index].isCollapsed;
    this.activeWorkout.set({ ...active });
  }

  // ----------------------------------------------------
  // Day Schedule Level Operations
  // ----------------------------------------------------
  duplicateDay(fromDayIndex: number, targetDayName: string): void {
    const list = [...this.days()];
    const sourceDay = list[fromDayIndex];
    const targetIdx = list.findIndex(d => d.dayName === targetDayName);

    if (targetIdx === -1 || !sourceDay.workouts) return;

    list[targetIdx].workouts = sourceDay.workouts.map(w => ({
      ...w,
      id: 'asg-' + Date.now() + '-' + Math.round(Math.random() * 10000),
      exercises: w.exercises.map(e => ({ ...e }))
    }));

    this.days.set(list);
    alert(`Successfully duplicated workouts to ${targetDayName}!`);
  }

  clearDayWorkouts(dayIndex: number): void {
    if (confirm(`Clear all workout plans for ${this.days()[dayIndex].dayName}?`)) {
      const list = [...this.days()];
      list[dayIndex].workouts = [];
      this.days.set(list);
    }
  }

  // ----------------------------------------------------
  // Publish Plan (Submit to DataService & redirect)
  // ----------------------------------------------------
  savePlan(): void {
    if (!this.userId()) return;

    // Compile workout plan, saving both new list structure and legacy fields (for old components)
    const plan = {
      userId: this.userId()!,
      days: this.days().map(d => {
        const flatExercises: Exercise[] = [];
        const titles: string[] = [];
        const categories: string[] = [];

        const workoutsList = d.workouts || [];
        workoutsList.forEach(w => {
          flatExercises.push(...w.exercises.map(e => ({ ...e })));
          if (w.title) titles.push(w.title);
          if (w.category) categories.push(w.category);
        });

        return {
          dayName: d.dayName,
          workoutTitle: titles.join(' + ') || 'Rest Day',
          category: categories.join(', ') || '',
          notes: workoutsList.map(w => w.notes ? `${w.title}: ${w.notes}` : '').filter(n => n).join('\n'),
          exercises: flatExercises,
          workouts: workoutsList.map(w => ({
            id: w.id,
            templateId: w.templateId,
            title: w.title,
            category: w.category,
            notes: w.notes,
            exercises: w.exercises.map(e => ({ ...e }))
          }))
        };
      }),
      stepsTarget: this.stepsTarget()
    };

    this.dataService.saveWorkoutPlan(plan);

    // Sync targets to today's active schedule for pushup tracking
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }); // e.g. "Monday"
    const todayWorkout = this.days().find(d => d.dayName === todayName);
    const activity = this.dataService.getTodayActivity(this.userId()!);

    let todayPushupsTarget = 0;
    if (todayWorkout && todayWorkout.workouts) {
      todayWorkout.workouts.forEach(w => {
        const pushupExercises = w.exercises.filter(e => e.exerciseName.toLowerCase().includes('push'));
        pushupExercises.forEach(e => {
          todayPushupsTarget += (e.reps * e.sets);
        });
      });
    }

    if (todayPushupsTarget > 0) {
      activity.workoutGoals.pushups.target = todayPushupsTarget;
    } else {
      // Look for a pushup exercise globally in the week as a target fallback
      let fallbackPushups = 0;
      this.days().forEach(d => {
        (d.workouts || []).forEach(w => {
          const pushupExc = w.exercises.find(e => e.exerciseName.toLowerCase().includes('push'));
          if (pushupExc && fallbackPushups === 0) {
            fallbackPushups = pushupExc.reps * pushupExc.sets;
          }
        });
      });
      if (fallbackPushups > 0) {
        activity.workoutGoals.pushups.target = fallbackPushups;
      }
    }

    activity.workoutGoals.steps.target = this.stepsTarget();
    this.dataService.saveDailyActivity(this.userId()!, activity);

    this.router.navigate(['/admin/dashboard']);
  }
}
