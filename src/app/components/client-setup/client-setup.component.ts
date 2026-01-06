import { Component, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-client-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-setup.component.html',
  styleUrl: './client-setup.component.scss'
})
export class ClientSetupComponent {
  weight = signal<number | null>(null);
  height = signal<number | null>(null);
  hasAllergies = signal(false);
  customAllergies = signal('');
  medicalConditions = signal('');
  foodPreferences = signal('');
  customFoodPreferences = signal('');

  // Common allergies with checkboxes
  commonAllergies = [
    { name: 'Peanuts', checked: signal(false) },
    { name: 'Dairy', checked: signal(false) },
    { name: 'Gluten', checked: signal(false) },
    { name: 'Eggs', checked: signal(false) },
    { name: 'Shellfish', checked: signal(false) },
    { name: 'Soy', checked: signal(false) },
    { name: 'Tree Nuts', checked: signal(false) },
    { name: 'Fish', checked: signal(false) }
  ];

  // Common food preferences with checkboxes
  commonFoodPreferences = [
    { name: 'Vegetarian', checked: signal(false) },
    { name: 'Non-Vegetarian', checked: signal(false) },
    { name: 'Vegan', checked: signal(false) },
    { name: 'Keto', checked: signal(false) },
    { name: 'Paleo', checked: signal(false) },
    { name: 'Low-Carb', checked: signal(false) },
    { name: 'Mediterranean', checked: signal(false) },
    { name: 'Halal', checked: signal(false) }
  ];

  bmi = computed(() => {
    const w = this.weight();
    const h = this.height();
    if (w && h && h > 0) {
      return parseFloat((w / ((h / 100) ** 2)).toFixed(1));
    }
    return null;
  });

  bmiCategory = computed(() => {
    const bmiValue = this.bmi();
    if (!bmiValue) return null;
    
    if (bmiValue < 18.5) {
      return { label: 'Underweight', color: '#4A90E2', range: 'Underweight (<18.5)' };
    } else if (bmiValue < 25) {
      return { label: 'Normal', color: '#22c55e', range: 'Normal (18.5-25)' };
    } else if (bmiValue < 30) {
      return { label: 'Overweight', color: '#FF9800', range: 'Overweight (25-30)' };
    } else {
      return { label: 'Obese', color: '#F44336', range: 'Obese (>30)' };
    }
  });

  bmiProgress = computed(() => {
    const bmiValue = this.bmi();
    if (!bmiValue) return { underweight: 0, normal: 0, overweight: 0, obese: 0 };
    
    // Calculate progress for each category
    let underweight = 0, normal = 0, overweight = 0, obese = 0;
    
    if (bmiValue < 18.5) {
      underweight = (bmiValue / 18.5) * 100;
    } else if (bmiValue < 25) {
      underweight = 100;
      normal = ((bmiValue - 18.5) / (25 - 18.5)) * 100;
    } else if (bmiValue < 30) {
      underweight = 100;
      normal = 100;
      overweight = ((bmiValue - 25) / (30 - 25)) * 100;
    } else {
      underweight = 100;
      normal = 100;
      overweight = 100;
      obese = Math.min(((bmiValue - 30) / 10) * 100, 100);
    }
    
    return { underweight, normal, overweight, obese };
  });

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {}

  toggleAllergy(allergy: any): void {
    allergy.checked.set(!allergy.checked());
    this.hasAllergies.set(this.commonAllergies.some(a => a.checked()));
  }

  toggleFoodPreference(pref: any): void {
    pref.checked.set(!pref.checked());
  }

  logout(): void {
    this.authService.logout();
  }

  onSubmit(): void {
    const user = this.authService.currentUser();
    if (!user || !this.weight() || !this.height()) {
      return;
    }

    // Collect selected allergies
    const selectedAllergies = this.commonAllergies
      .filter(a => a.checked())
      .map(a => a.name);
    
    // Add custom allergies if provided
    if (this.customAllergies().trim()) {
      const custom = this.customAllergies().split(',').map(a => a.trim()).filter(a => a.length > 0);
      selectedAllergies.push(...custom);
    }

    // Collect selected food preferences
    const selectedFoodPrefs = this.commonFoodPreferences
      .filter(p => p.checked())
      .map(p => p.name);
    
    // Add custom food preferences if provided
    if (this.customFoodPreferences().trim()) {
      const custom = this.customFoodPreferences().split(',').map(p => p.trim()).filter(p => p.length > 0);
      selectedFoodPrefs.push(...custom);
    }

    const profile = {
      userId: user.id,
      weight: this.weight()!,
      height: this.height()!,
      bmi: this.bmi()!,
      allergies: selectedAllergies,
      medicalConditions: this.medicalConditions(),
      foodPreferences: selectedFoodPrefs.join(', ')
    };

    this.dataService.saveClientProfile(profile);
    this.authService.updateUserProfile(user.id, { profileComplete: true });

    this.router.navigate(['/client/waiting']);
  }
}
