import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DataService, FoodItem } from '../../services/data.service';

export interface DietTemplate {
  id: string;
  mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'shake';
  calories: number;
  title: string;
  foods: string;
  notes: string;
  tags: string;
  isEditing?: boolean;
}

@Component({
  selector: 'app-diet-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './diet-plan.component.html',
  styleUrl: './diet-plan.component.scss'
})
export class DietPlanComponent implements OnInit {
  userId = signal<string>('');
  clientEmail = signal<string>('');
  allergies = signal<string[]>([]);

  // Client Plan Signals
  breakfast = signal<FoodItem[]>([]);
  lunch = signal<FoodItem[]>([]);
  dinner = signal<FoodItem[]>([]);
  snacks = signal<FoodItem[]>([]);
  shake = signal<FoodItem[]>([]);

  // Custom Item Inputs (for adding/editing foods directly in client's current plan)
  newItemName = signal('');
  newItemQuantity = signal('');
  newItemCalories = signal<number | null>(null);
  selectedMeal = signal<'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'shake'>('breakfast');

  // Meal Bank State
  activeMealBank = signal<'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'shake' | null>('breakfast');
  activeCalorieValue = signal<number | null>(300);
  customCalorieInput = signal<number | null>(null);

  // Calorie Edit State
  editingCalorieIndex = signal<number | null>(null);
  editingCalorieValue = signal<number | null>(null);

  calorieCards = signal<Record<string, number[]>>({
    breakfast: [300, 400, 500, 600, 700, 800, 900, 1000],
    lunch: [300, 400, 500, 600, 700, 800, 900, 1000],
    dinner: [300, 400, 500, 600, 700, 800, 900, 1000],
    snacks: [300, 400, 500, 600, 700, 800, 900, 1000],
    shake: [300, 400, 500, 600, 700, 800, 900, 1000]
  });

  templates = signal<DietTemplate[]>([]);

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
        const profile = this.dataService.getClientProfile(userId);
        if (profile) {
          this.allergies.set(profile.allergies);
        }
      }

      const existingPlan = this.dataService.getDietPlan(userId);
      if (existingPlan) {
        this.breakfast.set(existingPlan.breakfast || []);
        this.lunch.set(existingPlan.lunch || []);
        this.dinner.set(existingPlan.dinner || []);
        this.snacks.set(existingPlan.snacks || []);
        this.shake.set(existingPlan.shake || []);
      }
    }

    // Load templates & custom calories from storage
    this.loadCalorieCardsFromStorage();
    this.loadTemplatesFromStorage();
  }

  // LocalStorage Persist Functions
  saveCalorieCardsToStorage(): void {
    localStorage.setItem('dietCalorieCards', JSON.stringify(this.calorieCards()));
  }

  loadCalorieCardsFromStorage(): void {
    const data = localStorage.getItem('dietCalorieCards');
    if (data) {
      this.calorieCards.set(JSON.parse(data));
    }
  }

  saveTemplatesToStorage(): void {
    localStorage.setItem('dietPlanTemplates', JSON.stringify(this.templates()));
  }

  loadTemplatesFromStorage(): void {
    const data = localStorage.getItem('dietPlanTemplates');
    if (data) {
      this.templates.set(JSON.parse(data));
    } else {
      // Seed some initial demo templates
      const initial: DietTemplate[] = [
        {
          id: 't1',
          mealCategory: 'breakfast',
          calories: 300,
          title: 'High Protein Oats',
          foods: 'Oats (50g), Whey Protein (1 scoop), Almond Milk (200ml)',
          notes: 'Great for muscle recovery. Stir whey after heating oats.',
          tags: 'high-protein, oats, recovery'
        },
        {
          id: 't2',
          mealCategory: 'breakfast',
          calories: 500,
          title: 'Classic Eggs & Avocado Toast',
          foods: 'Whole Eggs (3), Avocado (50g), Sourdough Bread (2 slices)',
          notes: 'Healthy fats and high quality protein.',
          tags: 'healthy-fats, eggs, toast'
        },
        {
          id: 't3',
          mealCategory: 'shake',
          calories: 400,
          title: 'Peanut Butter Banana Shake',
          foods: 'Banana (1), Peanut Butter (2 tbsp), Whole Milk (250ml), Protein Powder (1 scoop)',
          notes: 'High calorie mass gainer shake.',
          tags: 'mass-gain, peanut-butter, smoothie'
        }
      ];
      this.templates.set(initial);
      this.saveTemplatesToStorage();
    }
  }

  // Meal Bank Expand/Collapse
  selectMealBank(category: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'shake'): void {
    if (this.activeMealBank() === category) {
      this.activeMealBank.set(null);
      this.activeCalorieValue.set(null);
    } else {
      this.activeMealBank.set(category);
      // Select the first calorie value if available
      const calories = this.calorieCards()[category];
      this.activeCalorieValue.set(calories && calories.length > 0 ? calories[0] : null);
    }
    this.editingCalorieIndex.set(null);
  }

  // Calorie Selection
  selectCalorieCard(calories: number): void {
    if (this.activeCalorieValue() === calories) {
      this.activeCalorieValue.set(null);
    } else {
      this.activeCalorieValue.set(calories);
    }
    this.editingCalorieIndex.set(null);
  }

  // Calorie Group CRUD
  addCalorieCard(): void {
    const category = this.activeMealBank();
    const val = this.customCalorieInput();
    if (!category || !val || val <= 0) return;
    
    const list = [...this.calorieCards()[category]];
    if (!list.includes(val)) {
      list.push(val);
      list.sort((a, b) => a - b);
      this.calorieCards.set({
        ...this.calorieCards(),
        [category]: list
      });
      this.saveCalorieCardsToStorage();
      this.activeCalorieValue.set(val);
    }
    this.customCalorieInput.set(null);
  }

  startEditCalorieCard(index: number, calories: number, event: Event): void {
    event.stopPropagation();
    this.editingCalorieIndex.set(index);
    this.editingCalorieValue.set(calories);
  }

  saveEditCalorieCard(event: Event): void {
    event.stopPropagation();
    const category = this.activeMealBank();
    const index = this.editingCalorieIndex();
    const newVal = this.editingCalorieValue();
    if (!category || index === null || !newVal || newVal <= 0) return;

    const oldVal = this.calorieCards()[category][index];
    const list = [...this.calorieCards()[category]];
    list[index] = newVal;
    list.sort((a, b) => a - b);
    this.calorieCards.set({
      ...this.calorieCards(),
      [category]: list
    });
    this.saveCalorieCardsToStorage();

    // Also update existing templates calorie value
    const updatedTemplates = this.templates().map(t => {
      if (t.mealCategory === category && t.calories === oldVal) {
        return { ...t, calories: newVal };
      }
      return t;
    });
    this.templates.set(updatedTemplates);
    this.saveTemplatesToStorage();

    this.editingCalorieIndex.set(null);
    this.editingCalorieValue.set(null);
    if (this.activeCalorieValue() === oldVal) {
      this.activeCalorieValue.set(newVal);
    }
  }

  cancelEditCalorieCard(event: Event): void {
    event.stopPropagation();
    this.editingCalorieIndex.set(null);
    this.editingCalorieValue.set(null);
  }

  removeCalorieCard(calories: number, event: Event): void {
    event.stopPropagation();
    const category = this.activeMealBank();
    if (!category) return;

    if (confirm(`Are you sure you want to remove the ${calories} kcal group and all its templates?`)) {
      const list = this.calorieCards()[category].filter(c => c !== calories);
      this.calorieCards.set({
        ...this.calorieCards(),
        [category]: list
      });
      this.saveCalorieCardsToStorage();

      // Remove templates
      const filtered = this.templates().filter(t => !(t.mealCategory === category && t.calories === calories));
      this.templates.set(filtered);
      this.saveTemplatesToStorage();

      if (this.activeCalorieValue() === calories) {
        this.activeCalorieValue.set(null);
      }
    }
  }

  // Template Management
  getCalorieTemplates(category: string, calories: number): DietTemplate[] {
    return this.templates().filter(t => t.mealCategory === category && t.calories === calories);
  }

  addTemplate(): void {
    const category = this.activeMealBank();
    const calories = this.activeCalorieValue();
    if (!category || !calories) return;

    const newTemplate: DietTemplate = {
      id: Date.now().toString(),
      mealCategory: category,
      calories: calories,
      title: '',
      foods: '',
      notes: '',
      tags: '',
      isEditing: true
    };

    this.templates.set([...this.templates(), newTemplate]);
    this.saveTemplatesToStorage();
  }

  saveTemplate(template: DietTemplate): void {
    if (!template.title.trim()) {
      alert('Please enter a meal title.');
      return;
    }
    const updated = this.templates().map(t => {
      if (t.id === template.id) {
        return { ...template, isEditing: false };
      }
      return t;
    });
    this.templates.set(updated);
    this.saveTemplatesToStorage();
  }

  editTemplate(templateId: string): void {
    const updated = this.templates().map(t => {
      if (t.id === templateId) {
        return { ...t, isEditing: true };
      }
      return t;
    });
    this.templates.set(updated);
  }

  duplicateTemplate(template: DietTemplate): void {
    const newTemplate: DietTemplate = {
      ...template,
      id: (Date.now() + Math.random()).toString(),
      title: `${template.title} (Copy)`,
      isEditing: false
    };
    this.templates.set([...this.templates(), newTemplate]);
    this.saveTemplatesToStorage();
  }

  deleteTemplate(templateId: string): void {
    if (confirm('Are you sure you want to delete this template?')) {
      const filtered = this.templates().filter(t => t.id !== templateId);
      this.templates.set(filtered);
      this.saveTemplatesToStorage();
    }
  }

  assignTemplateToClient(template: DietTemplate): void {
    const foodNames = template.foods
      .split(/[\n,]+/)
      .map(f => f.trim())
      .filter(f => f.length > 0);

    if (foodNames.length === 0) {
      alert('No food items found in this template. Please add foods first.');
      return;
    }

    const caloriesPerItem = Math.round(template.calories / foodNames.length);
    const foodItems: FoodItem[] = foodNames.map(name => ({
      name: name,
      quantity: '1 portion',
      calories: caloriesPerItem,
      consumed: false,
      isPrescribed: true
    }));

    const category = template.mealCategory;
    if (category === 'breakfast') this.breakfast.set(foodItems);
    else if (category === 'lunch') this.lunch.set(foodItems);
    else if (category === 'dinner') this.dinner.set(foodItems);
    else if (category === 'snacks') this.snacks.set(foodItems);
    else if (category === 'shake') this.shake.set(foodItems);
  }

  // Client Plan Actions (Individual edits)
  addCustomFood(): void {
    const name = this.newItemName().trim();
    const quantity = this.newItemQuantity().trim() || '1 portion';
    const calories = this.newItemCalories() || 0;
    
    if (name) {
      const mealType = this.selectedMeal();
      const current = this[mealType]();
      const newFood: FoodItem = {
        name,
        quantity,
        calories,
        consumed: false,
        isPrescribed: true
      };
      this[mealType].set([...current, newFood]);
      
      this.newItemName.set('');
      this.newItemQuantity.set('');
      this.newItemCalories.set(null);
    }
  }

  removeFood(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'shake', index: number): void {
    const current = this[mealType]();
    this[mealType].set(current.filter((_, i) => i !== index));
  }

  clearCategory(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'shake'): void {
    this[mealType].set([]);
  }

  getTotalCalories(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'shake'): number {
    return this[mealType]().reduce((sum, food) => sum + (food.calories || 0), 0);
  }

  hasAllergy(foodName: string): boolean {
    return this.allergies().some((a: string) => 
      foodName.toLowerCase().includes(a.toLowerCase()) || 
      a.toLowerCase().includes(foodName.toLowerCase())
    );
  }

  savePlan(): void {
    if (!this.userId()) return;

    const plan = {
      userId: this.userId()!,
      breakfast: this.breakfast(),
      lunch: this.lunch(),
      dinner: this.dinner(),
      snacks: this.snacks(),
      shake: this.shake()
    };

    this.dataService.saveDietPlan(plan);
    this.authService.markDietPlanAssigned(this.userId()!);
    
    // Update activity
    const activity = this.dataService.getTodayActivity(this.userId()!);
    const markAsPrescribed = (items: FoodItem[]) => {
      return items.map(item => ({
        ...item,
        isPrescribed: true,
        consumed: item.consumed !== undefined ? item.consumed : false
      }));
    };
    
    activity.meals.breakfast.items = markAsPrescribed(this.breakfast());
    activity.meals.lunch.items = markAsPrescribed(this.lunch());
    activity.meals.dinner.items = markAsPrescribed(this.dinner());
    activity.meals.snacks.items = markAsPrescribed(this.snacks());
    
    if (this.shake().length > 0) {
      activity.meals.shake = {
        items: markAsPrescribed(this.shake()),
        completed: activity.meals.shake?.completed || false
      };
    } else {
      delete activity.meals.shake;
    }
    
    // Recalculate calories consumed
    let totalConsumed = 0;
    const addConsumed = (mealItems: FoodItem[] | undefined) => {
      if (!mealItems) return;
      totalConsumed += mealItems.filter(item => item.consumed).reduce((sum, item) => sum + (item.calories || 0), 0);
    };
    addConsumed(activity.meals.breakfast.items);
    addConsumed(activity.meals.lunch.items);
    addConsumed(activity.meals.dinner.items);
    addConsumed(activity.meals.snacks.items);
    if (activity.meals.shake) {
      addConsumed(activity.meals.shake.items);
    }
    activity.caloriesConsumed = totalConsumed;
    
    this.dataService.saveDailyActivity(this.userId()!, activity);
    this.router.navigate(['/admin/workout-plan', this.userId()]);
  }

  skip(): void {
    this.router.navigate(['/admin/workout-plan', this.userId()]);
  }
}
