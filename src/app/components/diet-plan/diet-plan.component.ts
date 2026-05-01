import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DataService, FoodItem } from '../../services/data.service';

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
  breakfast = signal<FoodItem[]>([]);
  lunch = signal<FoodItem[]>([]);
  dinner = signal<FoodItem[]>([]);
  snacks = signal<FoodItem[]>([]);
  newItemName = signal('');
  newItemQuantity = signal('');
  newItemCalories = signal<number | null>(null);
  selectedMeal = signal<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  allergies = signal<string[]>([]);

  // Individual meal inputs
  mealInputs: {
    breakfast: { name: string; quantity: string; calories: number | null };
    lunch: { name: string; quantity: string; calories: number | null };
    dinner: { name: string; quantity: string; calories: number | null };
    snacks: { name: string; quantity: string; calories: number | null };
  } = {
    breakfast: { name: '', quantity: '', calories: null },
    lunch: { name: '', quantity: '', calories: null },
    dinner: { name: '', quantity: '', calories: null },
    snacks: { name: '', quantity: '', calories: null }
  };

  commonFoods = {
    breakfast: ['Oatmeal', 'Eggs', 'Greek Yogurt', 'Whole Grain Toast', 'Fruits', 'Smoothie'],
    lunch: ['Grilled Chicken', 'Salad', 'Brown Rice', 'Vegetables', 'Quinoa', 'Fish'],
    dinner: ['Lean Protein', 'Steamed Vegetables', 'Sweet Potato', 'Salmon', 'Turkey', 'Beans'],
    snacks: ['Nuts', 'Apple', 'Protein Bar', 'Greek Yogurt', 'Banana', 'Trail Mix']
  };

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
      }
    }
  }

  showFoodDialog = signal<{ show: boolean; mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | null; foodName: string }>({
    show: false,
    mealType: null,
    foodName: ''
  });

  tempFoodInput = { quantity: '1', calories: null as number | null };

  openFoodDialog(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', foodName: string): void {
    this.showFoodDialog.set({
      show: true,
      mealType: mealType,
      foodName: foodName
    });
    this.tempFoodInput = { quantity: '1', calories: null };
  }

  closeFoodDialog(): void {
    this.showFoodDialog.set({
      show: false,
      mealType: null,
      foodName: ''
    });
  }

  confirmAddFood(): void {
    const dialog = this.showFoodDialog();
    if (!dialog.mealType || !dialog.foodName) return;

    const input = this.tempFoodInput;
    this.addFood(
      dialog.mealType,
      dialog.foodName,
      input.quantity || '1',
      input.calories || 0
    );
    this.closeFoodDialog();
  }

  addFood(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', foodName: string, quantity: string = '1', calories: number = 0): void {
    const current = this[mealType]();
    const newFood: FoodItem = {
      name: foodName,
      quantity: quantity,
      calories: calories,
      consumed: false,
      isPrescribed: true // All items from trainer are prescribed
    };
    this[mealType].set([...current, newFood]);
  }

  addCustomFood(): void {
    const name = this.newItemName().trim();
    const quantity = this.newItemQuantity().trim() || '1';
    const calories = this.newItemCalories() || 0;
    
    if (name) {
      const mealType = this.selectedMeal();
      this.addFood(mealType, name, quantity, calories);
      this.newItemName.set('');
      this.newItemQuantity.set('');
      this.newItemCalories.set(null);
    }
  }

  addMealFood(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks'): void {
    const input = this.mealInputs[mealType];
    const name = input.name.trim();
    const quantity = input.quantity.trim() || '1';
    const calories = input.calories || 0;
    
    if (name) {
      this.addFood(mealType, name, quantity, calories);
      // Reset input
      this.mealInputs[mealType] = { name: '', quantity: '', calories: null };
    }
  }

  removeFood(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', index: number): void {
    const current = this[mealType]();
    this[mealType].set(current.filter((_, i) => i !== index));
  }

  getFoodDisplay(food: FoodItem): string {
    if (food.quantity && food.calories > 0) {
      return `${food.name} ${food.quantity} (${food.calories} calories)`;
    } else if (food.quantity) {
      return `${food.name} ${food.quantity}`;
    } else if (food.calories > 0) {
      return `${food.name} (${food.calories} calories)`;
    }
    return food.name;
  }

  getTotalCalories(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks'): number {
    return this[mealType]().reduce((sum, food) => sum + (food.calories || 0), 0);
  }

  hasAllergy(food: string | FoodItem): boolean {
    const foodName = typeof food === 'string' ? food : food.name;
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
      snacks: this.snacks()
    };

    this.dataService.saveDietPlan(plan);
    this.authService.markDietPlanAssigned(this.userId()!);
    
    // Update today's activity with meal items
    const today = new Date().toISOString().split('T')[0];
    const activity = this.dataService.getTodayActivity(this.userId()!);
    
    // Ensure all items are marked as prescribed
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
    
    // Calculate total calories consumed (only from consumed items)
    activity.caloriesConsumed = activity.meals.breakfast.items
      .filter(item => item.consumed)
      .reduce((sum, item) => sum + (item.calories || 0), 0) +
      activity.meals.lunch.items
      .filter(item => item.consumed)
      .reduce((sum, item) => sum + (item.calories || 0), 0) +
      activity.meals.dinner.items
      .filter(item => item.consumed)
      .reduce((sum, item) => sum + (item.calories || 0), 0) +
      activity.meals.snacks.items
      .filter(item => item.consumed)
      .reduce((sum, item) => sum + (item.calories || 0), 0);
    
    this.dataService.saveDailyActivity(this.userId()!, activity);

    this.router.navigate(['/admin/workout-plan', this.userId()]);
  }

  skip(): void {
    this.router.navigate(['/admin/workout-plan', this.userId()]);
  }
}

