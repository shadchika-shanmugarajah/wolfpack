import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';

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
  breakfast = signal<string[]>([]);
  lunch = signal<string[]>([]);
  dinner = signal<string[]>([]);
  snacks = signal<string[]>([]);
  newItem = signal('');
  selectedMeal = signal<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  allergies = signal<string[]>([]);

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
        this.breakfast.set(existingPlan.breakfast);
        this.lunch.set(existingPlan.lunch);
        this.dinner.set(existingPlan.dinner);
        this.snacks.set(existingPlan.snacks);
      }
    }
  }

  addFood(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', food: string): void {
    const current = this[mealType]();
    if (!current.includes(food)) {
      this[mealType].set([...current, food]);
    }
  }

  addCustomFood(): void {
    const food = this.newItem().trim();
    if (food) {
      const mealType = this.selectedMeal();
      this.addFood(mealType, food);
      this.newItem.set('');
    }
  }

  removeFood(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', food: string): void {
    const current = this[mealType]();
    this[mealType].set(current.filter((f: string) => f !== food));
  }

  hasAllergy(food: string): boolean {
    return this.allergies().some((a: string) => 
      food.toLowerCase().includes(a.toLowerCase()) || 
      a.toLowerCase().includes(food.toLowerCase())
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
    
    // Update today's activity with meal items
    const today = new Date().toISOString().split('T')[0];
    const activity = this.dataService.getTodayActivity(this.userId()!);
    activity.meals.breakfast.items = this.breakfast();
    activity.meals.lunch.items = this.lunch();
    activity.meals.dinner.items = this.dinner();
    activity.meals.snacks.items = this.snacks();
    this.dataService.saveDailyActivity(this.userId()!, activity);

    this.router.navigate(['/admin/workout-plan', this.userId()]);
  }

  skip(): void {
    this.router.navigate(['/admin/workout-plan', this.userId()]);
  }
}

