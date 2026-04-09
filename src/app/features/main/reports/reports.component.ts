import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { WebIconComponent } from '../../../shared/components/web-icon.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgZorroModule } from '../../../shared/modules/ng-zorro.module';
import { GeneralService } from '../../../core/services/general.service';
import { ReportCustomersService } from '../../../core/services/reports.service';
import { ReportCustomer } from '../../../core/interfaces/report-customers.interface';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['../main.styles.css', './reports.styles.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 min-h-0 overflow-hidden' },
  imports: [
    CommonModule,
    WebIconComponent,
    NgZorroModule,
    ReactiveFormsModule
  ]
})
export class ReportsComponent implements OnInit {
  private generalService = inject(GeneralService);
  private reportCustomersService = inject(ReportCustomersService);

  filtersForm: FormGroup = new FormGroup({
    customerId: new FormControl(''),
    customersGrade: new FormControl(''),
    userId: new FormControl(''),
    capital: new FormControl('C'),
    loanState: new FormControl(''),
    feeState: new FormControl(''),
    dateRange: new FormControl('A')
  })

  isLoading = signal(false);
  reportCustomers = signal<ReportCustomer[]>([]);
  error = signal<string | null>(null);
  currentPage = signal(1);
  readonly pageSize = 10;
  totalItems = signal(0);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  rangeStart = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.totalItems()));

  getCustomers!: () => void;

  constructor() { }

  ngOnInit() {
    this.getCustomers = this.generalService.debounce(() => {
      this.currentPage.set(1);
      this.fetchCustomers();
    });

    this.fetchCustomers();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchCustomers();
  }

  getFullName(customer: ReportCustomer): string {
    return [customer.first_name, customer.second_name, customer.last_names]
      .filter(Boolean)
      .join(' ');
  }

  getGradeLabel(grade: string): string {
    const labels: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
    return labels[grade] ?? grade;
  }

  getLoanStateLabel(state: string): string {
    switch (state) {
      case 'A': return 'Aprobado';
      case 'IP': return 'En Proceso';
      case 'R': return 'Rechazado';
      case 'C': return 'Cerrado';
      default: return state;
    }
  }

  getLoanStateClasses(state: string): string {
    switch (state) {
      case 'A': // Approved
        return 'border-green-500 text-green-700 bg-green-100';

      case 'IP': // In Progress
        return 'border-orange-400 text-orange-700 bg-orange-100';

      case 'R': // Rejected
        return 'border-red-500 text-red-700 bg-red-100';

      case 'C': // Closed
        return 'border-purple-500 text-purple-700 bg-purple-100';

      default:
        return 'border-gray-300 text-gray-600 bg-gray-100';
    }
  }

  private fetchCustomers() {
    this.isLoading.set(true);
    this.error.set(null);

    this.reportCustomersService.getReportCustomers('', this.currentPage(), this.pageSize)
      .subscribe({
        next: ({ data, total }) => {
          this.reportCustomers.set(data);
          this.totalItems.set(total);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.error.set('Error cargando clientes');
          this.isLoading.set(false);
        }
      });
  }

  getStateColor(state: string): string {
    switch (state) {
      case 'Active':
        return 'var(--success)';
      case 'Inactive':
        return 'var(--warning)';
      case 'Blocked':
        return 'var(--error)';
      default:
        return 'gray';
    }
  }

  generateReport() {

  }
}
