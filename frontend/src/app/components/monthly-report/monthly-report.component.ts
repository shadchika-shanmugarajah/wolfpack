import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-monthly-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthly-report.component.html',
  styleUrl: './monthly-report.component.scss'
})
export class MonthlyReportComponent implements OnInit {
  reportData = signal<any>(null);
  currentMonth = signal(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));

  constructor(
    public authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateReport();
  }

  generateReport(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const activities = this.dataService.getDailyActivities(user.id);
    const profile = this.dataService.getClientProfile(user.id);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyActivities = activities.filter(a => {
      const activityDate = new Date(a.date);
      return activityDate >= monthStart;
    });

    const weights = monthlyActivities.filter(a => a.weight).map(a => a.weight!);
    const startWeight = weights.length > 0 ? weights[0] : profile?.weight || 0;
    const endWeight = weights.length > 0 ? weights[weights.length - 1] : profile?.weight || 0;
    const weightChange = endWeight - startWeight;

    const totalWorkouts = monthlyActivities.reduce((sum, a) => {
      return sum + Object.values(a.workoutGoals).filter((g: any) => g.done).length;
    }, 0);

    const totalMeals = monthlyActivities.reduce((sum, a) => {
      return sum + Object.values(a.meals).filter((m: any) => m.completed).length;
    }, 0);

    const totalPossible = monthlyActivities.length * 6; // 2 workouts + 4 meals
    const completionRate = totalPossible > 0 ? Math.round((totalWorkouts + totalMeals) / totalPossible * 100) : 0;

    this.reportData.set({
      startWeight,
      endWeight,
      weightChange,
      totalWorkouts,
      totalMeals,
      completionRate,
      daysTracked: monthlyActivities.length
    });
  }

  downloadPDF(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Monthly Report - ${this.currentMonth()}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #1a1a1a; }
              .report-section { margin: 30px 0; }
              .stat-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>Monthly Fitness Report</h1>
            <p><strong>Month:</strong> ${this.currentMonth()}</p>
            ${this.generatePDFContent()}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  private generatePDFContent(): string {
    const data = this.reportData();
    if (!data) return '';

    return `
      <div class="report-section">
        <h2>Weight Summary</h2>
        <div class="stat-box">
          <p><strong>Starting Weight:</strong> ${data.startWeight} kg</p>
          <p><strong>Ending Weight:</strong> ${data.endWeight} kg</p>
          <p><strong>Weight Change:</strong> ${data.weightChange > 0 ? '+' : ''}${data.weightChange.toFixed(1)} kg</p>
        </div>
      </div>
      <div class="report-section">
        <h2>Activity Summary</h2>
        <div class="stat-box">
          <p><strong>Workouts Completed:</strong> ${data.totalWorkouts}</p>
          <p><strong>Meals Completed:</strong> ${data.totalMeals}</p>
          <p><strong>Overall Completion Rate:</strong> ${data.completionRate}%</p>
          <p><strong>Days Tracked:</strong> ${data.daysTracked}</p>
        </div>
      </div>
    `;
  }

  goBack(): void {
    this.router.navigate(['/client/dashboard']);
  }
}



