import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DataService, Exercise, DayWorkout } from '../../services/data.service';

export interface WorkoutFolder {
  folderId: string;
  folderName: string;
}

export interface WorkoutCategory {
  categoryId: string;
  categoryName: string;
}

export interface WorkoutTemplate {
  templateId: string;
  folderId: string; // linked to folder
  categoryId: string; // linked to category
  title: string;
  exercises: Exercise[];
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
    { dayName: 'Monday', workoutTitle: '', category: '', notes: '', exercises: [] },
    { dayName: 'Tuesday', workoutTitle: '', category: '', notes: '', exercises: [] },
    { dayName: 'Wednesday', workoutTitle: '', category: '', notes: '', exercises: [] },
    { dayName: 'Thursday', workoutTitle: '', category: '', notes: '', exercises: [] },
    { dayName: 'Friday', workoutTitle: '', category: '', notes: '', exercises: [] },
    { dayName: 'Saturday', workoutTitle: '', category: '', notes: '', exercises: [] },
    { dayName: 'Sunday', workoutTitle: '', category: '', notes: '', exercises: [] }
  ]);

  // Editor State
  activeDayIndex = signal<number | null>(null);
  activeDayWorkout = signal<DayWorkout | null>(null);
  showCreateCategoryInput = signal(false);
  newCategoryInputVal = signal('');
  targetDuplicateDay = signal<string>('');

  // Library State
  folders = signal<WorkoutFolder[]>([]);
  categories = signal<WorkoutCategory[]>([]);
  templates = signal<WorkoutTemplate[]>([]);

  // Library Controls
  newFolderName = signal('');
  newCategoryName = signal('');
  newTemplateTitle = signal('');
  selectedFolderId = signal('');
  selectedCategoryId = signal('');

  // Editing items inside library manager
  editingFolderId = signal<string | null>(null);
  editingFolderName = signal<string>('');
  editingCategoryId = signal<string | null>(null);
  editingCategoryName = signal<string>('');
  editingTemplateId = signal<string | null>(null);
  editingTemplateTitle = signal<string>('');

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
        this.stepsTarget.set(existingPlan.stepsTarget);
        if (existingPlan.days && existingPlan.days.length === 7) {
          this.days.set(existingPlan.days);
        } else if (existingPlan.exercises && existingPlan.exercises.length > 0) {
          // Backward compatibility: map old structure to Monday
          const mappedDays = [...this.days()];
          mappedDays[0] = {
            dayName: 'Monday',
            workoutTitle: 'Daily Exercises',
            category: 'Strength',
            notes: 'Legacy workout plan',
            exercises: existingPlan.exercises.map((e: any) => ({
              exerciseName: e.name,
              sets: e.sets,
              reps: e.reps,
              time: 'N/A',
              rest: '60s',
              notes: `Frequency: ${e.frequency}`
            }))
          };
          this.days.set(mappedDays);
        }
      }
    }

    // Load templates library
    this.loadLibrary();
  }

  // ----------------------------------------------------
  // Library Storage Operations
  // ----------------------------------------------------
  loadLibrary(): void {
    const storedFolders = localStorage.getItem('workoutFolders');
    const storedCategories = localStorage.getItem('workoutCategories');
    const storedTemplates = localStorage.getItem('workoutTemplates');

    if (storedFolders) this.folders.set(JSON.parse(storedFolders));
    if (storedCategories) this.categories.set(JSON.parse(storedCategories));
    if (storedTemplates) this.templates.set(JSON.parse(storedTemplates));

    // If completely empty, seed initial data for demonstration
    if (!storedFolders && !storedCategories && !storedTemplates) {
      const demoFolders: WorkoutFolder[] = [
        { folderId: 'f1', folderName: 'Strength Training' },
        { folderId: 'f2', folderName: 'Cardio Splits' }
      ];
      const demoCategories: WorkoutCategory[] = [
        { categoryId: 'c1', categoryName: 'Push' },
        { categoryId: 'c2', categoryName: 'Pull' },
        { categoryId: 'c3', categoryName: 'Legs' },
        { categoryId: 'c4', categoryName: 'HIIT' }
      ];
      const demoTemplates: WorkoutTemplate[] = [
        {
          templateId: 't1',
          folderId: 'f1',
          categoryId: 'c1',
          title: 'Push Day Split',
          exercises: [
            { exerciseName: 'Barbell Bench Press', sets: 4, reps: 10, time: 'N/A', rest: '90s', notes: 'Keep elbows slightly tucked' },
            { exerciseName: 'Dumbbell Overhead Press', sets: 3, reps: 10, time: 'N/A', rest: '90s', notes: 'Full range of motion' },
            { exerciseName: 'Tricep Rope Pushdowns', sets: 3, reps: 12, time: 'N/A', rest: '60s', notes: 'Squeeze at the bottom' }
          ]
        },
        {
          templateId: 't2',
          folderId: 'f1',
          categoryId: 'c2',
          title: 'Pull Day Split',
          exercises: [
            { exerciseName: 'Deadlift', sets: 4, reps: 5, time: 'N/A', rest: '120s', notes: 'Flat back, engage core' },
            { exerciseName: 'Pull-ups', sets: 3, reps: 8, time: 'N/A', rest: '90s', notes: 'Controlled negative' },
            { exerciseName: 'Barbell Bicep Curls', sets: 3, reps: 12, time: 'N/A', rest: '60s', notes: 'No swinging' }
          ]
        }
      ];

      this.folders.set(demoFolders);
      this.categories.set(demoCategories);
      this.templates.set(demoTemplates);
      this.saveLibrary();
    }
  }

  saveLibrary(): void {
    localStorage.setItem('workoutFolders', JSON.stringify(this.folders()));
    localStorage.setItem('workoutCategories', JSON.stringify(this.categories()));
    localStorage.setItem('workoutTemplates', JSON.stringify(this.templates()));
  }

  // ----------------------------------------------------
  // Folder CRUD
  // ----------------------------------------------------
  createFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) return;
    const newFolder: WorkoutFolder = {
      folderId: Date.now().toString(),
      folderName: name
    };
    this.folders.set([...this.folders(), newFolder]);
    this.newFolderName.set('');
    this.saveLibrary();
  }

  startEditFolder(folder: WorkoutFolder, event: Event): void {
    event.stopPropagation();
    this.editingFolderId.set(folder.folderId);
    this.editingFolderName.set(folder.folderName);
  }

  saveEditFolder(event: Event): void {
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
    if (confirm('Delete this folder? Templates inside it will be moved to unorganized.')) {
      this.folders.set(this.folders().filter(f => f.folderId !== folderId));
      this.templates.set(this.templates().map(t => t.folderId === folderId ? { ...t, folderId: '' } : t));
      this.saveLibrary();
    }
  }

  // ----------------------------------------------------
  // Category CRUD
  // ----------------------------------------------------
  createCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) return;
    const newCat: WorkoutCategory = {
      categoryId: Date.now().toString(),
      categoryName: name
    };
    this.categories.set([...this.categories(), newCat]);
    this.newCategoryName.set('');
    this.saveLibrary();
  }

  startEditCategory(cat: WorkoutCategory, event: Event): void {
    event.stopPropagation();
    this.editingCategoryId.set(cat.categoryId);
    this.editingCategoryName.set(cat.categoryName);
  }

  saveEditCategory(event: Event): void {
    event.stopPropagation();
    const id = this.editingCategoryId();
    const name = this.editingCategoryName().trim();
    if (!id || !name) return;

    this.categories.set(this.categories().map(c => c.categoryId === id ? { ...c, categoryName: name } : c));
    this.editingCategoryId.set(null);
    this.saveLibrary();
  }

  deleteCategory(categoryId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Delete this category? Templates in this category will be reset to unassigned.')) {
      this.categories.set(this.categories().filter(c => c.categoryId !== categoryId));
      this.templates.set(this.templates().map(t => t.categoryId === categoryId ? { ...t, categoryId: '' } : t));
      this.saveLibrary();
    }
  }

  // ----------------------------------------------------
  // Template CRUD in Library
  // ----------------------------------------------------
  deleteTemplate(templateId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Delete this template permanently?')) {
      this.templates.set(this.templates().filter(t => t.templateId !== templateId));
      this.saveLibrary();
    }
  }

  duplicateTemplateInLibrary(template: WorkoutTemplate, event: Event): void {
    event.stopPropagation();
    const newTemplate: WorkoutTemplate = {
      ...template,
      templateId: (Date.now() + Math.random()).toString(),
      title: `${template.title} (Copy)`,
      exercises: template.exercises.map(e => ({ ...e }))
    };
    this.templates.set([...this.templates(), newTemplate]);
    this.saveLibrary();
  }

  // ----------------------------------------------------
  // Day Workout Editor Panel Trigger
  // ----------------------------------------------------
  editDay(index: number): void {
    this.activeDayIndex.set(index);
    const dayData = this.days()[index];
    // Copy data to activeState to enable cancel/close actions
    this.activeDayWorkout.set({
      dayName: dayData.dayName,
      workoutTitle: dayData.workoutTitle,
      category: dayData.category,
      notes: dayData.notes,
      exercises: dayData.exercises.map(e => ({ ...e, isCollapsed: e.isCollapsed ?? false }))
    });
    this.showCreateCategoryInput.set(false);
    // Find first day that isn't the active day to set as default duplicate target
    const target = this.days().find((_, i) => i !== index)?.dayName || '';
    this.targetDuplicateDay.set(target);
  }

  closeEditor(): void {
    this.activeDayIndex.set(null);
    this.activeDayWorkout.set(null);
  }

  saveDayWorkout(): void {
    const idx = this.activeDayIndex();
    const active = this.activeDayWorkout();
    if (idx === null || !active) return;

    const list = [...this.days()];
    list[idx] = {
      dayName: active.dayName,
      workoutTitle: active.workoutTitle.trim() || 'Rest/General Workout',
      category: active.category,
      notes: active.notes,
      exercises: active.exercises.map(e => ({ ...e }))
    };
    this.days.set(list);
    this.closeEditor();
  }

  // ----------------------------------------------------
  // Exercise Item Operations in Editor
  // ----------------------------------------------------
  addExerciseToActive(): void {
    const active = this.activeDayWorkout();
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
    this.activeDayWorkout.set({ ...active });
  }

  removeExerciseFromActive(index: number): void {
    const active = this.activeDayWorkout();
    if (!active) return;

    active.exercises = active.exercises.filter((_, i) => i !== index);
    this.activeDayWorkout.set({ ...active });
  }

  duplicateExerciseInActive(index: number): void {
    const active = this.activeDayWorkout();
    if (!active) return;

    const source = active.exercises[index];
    const copy: Exercise = {
      ...source,
      exerciseName: source.exerciseName ? `${source.exerciseName} (Copy)` : ''
    };
    // Insert after current index
    active.exercises.splice(index + 1, 0, copy);
    this.activeDayWorkout.set({ ...active });
  }

  moveExercise(index: number, direction: 'up' | 'down'): void {
    const active = this.activeDayWorkout();
    if (!active) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= active.exercises.length) return;

    const temp = active.exercises[index];
    active.exercises[index] = active.exercises[targetIndex];
    active.exercises[targetIndex] = temp;
    this.activeDayWorkout.set({ ...active });
  }

  toggleCollapseExercise(index: number): void {
    const active = this.activeDayWorkout();
    if (!active) return;
    active.exercises[index].isCollapsed = !active.exercises[index].isCollapsed;
    this.activeDayWorkout.set({ ...active });
  }

  // ----------------------------------------------------
  // Load Template & Category Selection
  // ----------------------------------------------------
  loadTemplateIntoActive(templateId: string): void {
    if (!templateId) return;
    const template = this.templates().find(t => t.templateId === templateId);
    const active = this.activeDayWorkout();
    if (!template || !active) return;

    active.workoutTitle = template.title;
    // Map template category
    const cat = this.categories().find(c => c.categoryId === template.categoryId);
    active.category = cat ? cat.categoryName : '';
    // Copy exercises
    active.exercises = template.exercises.map(e => ({ ...e, isCollapsed: false }));
    this.activeDayWorkout.set({ ...active });
  }

  handleCategorySelect(val: string): void {
    const active = this.activeDayWorkout();
    if (!active) return;

    if (val === '__new__') {
      this.showCreateCategoryInput.set(true);
      this.newCategoryInputVal.set('');
      active.category = '';
    } else {
      this.showCreateCategoryInput.set(false);
      active.category = val;
    }
    this.activeDayWorkout.set({ ...active });
  }

  saveNewCategoryInline(): void {
    const name = this.newCategoryInputVal().trim();
    const active = this.activeDayWorkout();
    if (!name || !active) return;

    // Create category in library
    const newCatId = Date.now().toString();
    const newCat: WorkoutCategory = {
      categoryId: newCatId,
      categoryName: name
    };
    this.categories.set([...this.categories(), newCat]);
    this.saveLibrary();

    // Assign to active
    active.category = name;
    this.activeDayWorkout.set({ ...active });
    this.showCreateCategoryInput.set(false);
  }

  // ----------------------------------------------------
  // Template Saving & Day Duplication Actions
  // ----------------------------------------------------
  saveActiveAsTemplate(): void {
    const active = this.activeDayWorkout();
    if (!active) return;

    if (!active.workoutTitle.trim()) {
      alert('Please enter a workout title before saving as template.');
      return;
    }

    const tName = prompt('Enter a name for this template:', active.workoutTitle);
    if (tName === null) return; // Cancelled
    const finalName = tName.trim() || active.workoutTitle;

    // Optional folder selection
    let folderPromptMsg = 'Organize in folder?\nSelect number:\n0: None (Unorganized)\n';
    this.folders().forEach((f, i) => {
      folderPromptMsg += `${i + 1}: ${f.folderName}\n`;
    });
    const folderIdxStr = prompt(folderPromptMsg, '0');
    let fId = '';
    if (folderIdxStr !== null) {
      const idx = parseInt(folderIdxStr) - 1;
      if (idx >= 0 && idx < this.folders().length) {
        fId = this.folders()[idx].folderId;
      }
    }

    // Match active category
    const catMatch = this.categories().find(c => c.categoryName.toLowerCase() === active.category.toLowerCase());
    let cId = catMatch ? catMatch.categoryId : '';

    const newTemplate: WorkoutTemplate = {
      templateId: Date.now().toString(),
      folderId: fId,
      categoryId: cId,
      title: finalName,
      exercises: active.exercises.map(e => ({ ...e }))
    };

    this.templates.set([...this.templates(), newTemplate]);
    this.saveLibrary();
    alert(`Successfully saved template "${finalName}" to library!`);
  }

  duplicateActiveDayToTarget(): void {
    const active = this.activeDayWorkout();
    const target = this.targetDuplicateDay();
    if (!active || !target) return;

    const list = [...this.days()];
    const targetIdx = list.findIndex(d => d.dayName === target);
    if (targetIdx === -1) return;

    list[targetIdx] = {
      dayName: target,
      workoutTitle: active.workoutTitle || 'Rest/General Workout',
      category: active.category,
      notes: active.notes,
      exercises: active.exercises.map(e => ({ ...e }))
    };
    this.days.set(list);
    alert(`Successfully duplicated workout to ${target}!`);
  }

  clearActiveDay(): void {
    const active = this.activeDayWorkout();
    if (!active) return;

    if (confirm('Clear all fields and exercises for this day?')) {
      active.workoutTitle = '';
      active.category = '';
      active.notes = '';
      active.exercises = [];
      this.activeDayWorkout.set({ ...active });
    }
  }

  clearDayIndex(index: number, event: Event): void {
    event.stopPropagation();
    if (confirm(`Clear all workout plans for ${this.days()[index].dayName}?`)) {
      const list = [...this.days()];
      list[index] = {
        dayName: list[index].dayName,
        workoutTitle: '',
        category: '',
        notes: '',
        exercises: []
      };
      this.days.set(list);
    }
  }

  // ----------------------------------------------------
  // Publish Plan (Weekly Workflow final step)
  // ----------------------------------------------------
  savePlan(): void {
    if (!this.userId()) return;

    // Save Workout Plan
    const plan = {
      userId: this.userId()!,
      days: this.days().map(d => ({
        dayName: d.dayName,
        workoutTitle: d.workoutTitle,
        category: d.category,
        notes: d.notes,
        exercises: d.exercises.map(e => ({ ...e }))
      })),
      stepsTarget: this.stepsTarget()
    };

    this.dataService.saveWorkoutPlan(plan);

    // Update today's activity pushups & steps goals
    const today = new Date().toISOString().split('T')[0];
    const activity = this.dataService.getTodayActivity(this.userId()!);

    // Check if there are pushups exercises assigned in today's workout plan
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }); // e.g. "Monday"
    const todayWorkout = this.days().find(d => d.dayName === todayName);
    
    let todayPushupsTarget = 0;
    if (todayWorkout) {
      const pushupExercises = todayWorkout.exercises.filter(e => e.exerciseName.toLowerCase().includes('push'));
      pushupExercises.forEach(e => {
        todayPushupsTarget += (e.reps * e.sets);
      });
    }

    if (todayPushupsTarget > 0) {
      activity.workoutGoals.pushups.target = todayPushupsTarget;
    } else {
      // Find average pushups in exercises or keep standard 50/100
      const pushupExc = this.days()
        .flatMap(d => d.exercises)
        .find(e => e.exerciseName.toLowerCase().includes('push'));
      if (pushupExc) {
        activity.workoutGoals.pushups.target = pushupExc.reps * pushupExc.sets;
      }
    }
    
    activity.workoutGoals.steps.target = this.stepsTarget();
    this.dataService.saveDailyActivity(this.userId()!, activity);

    this.router.navigate(['/admin/dashboard']);
  }

  getFolderTemplates(folderId: string): WorkoutTemplate[] {
    return this.templates().filter(t => t.folderId === folderId);
  }

  getUnorganizedTemplates(): WorkoutTemplate[] {
    const folderIds = this.folders().map(f => f.folderId);
    return this.templates().filter(t => !t.folderId || !folderIds.includes(t.folderId));
  }

  getCategoryTemplates(categoryId: string): WorkoutTemplate[] {
    return this.templates().filter(t => t.categoryId === categoryId);
  }
}
