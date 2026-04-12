import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { WebIconComponent } from '../../../shared/components/web-icon.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgZorroModule } from '../../../shared/modules/ng-zorro.module';
import { GeneralService } from '../../../core/services/general.service';
import { ReportCustomer } from '../../../core/interfaces/report-customers.interface';
import { LoanStateAcronym } from '../../../core/types/loan-state.type';
import { CustomersService } from '../../../core/services/pages/customers.service';
import { Customer } from '../../../core/interfaces/customers.interface';
import { LocalUser } from '../../../core/interfaces/users.interface';
import { ReportsService } from '../../../core/services/pages/reports.service';
import { PaymentGrade } from '../../../core/types/payment-grade.type';
import { ExcelService } from '../../../core/services/pages/excel.service';

export interface ReportFilters {
  search?: string;
  customerId?: string;
  customersGrade?: string[];
  userId?: string;
  loanState?: string;
  feeState?: string;
  dateRange?: [Date, Date] | null;
  page?: number;
  pageSize?: number;
}

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
  private customersService = inject(CustomersService);
  private reportsService = inject(ReportsService);
  private excelService = inject(ExcelService);

  readonly grades: PaymentGrade[] = ['1', '2', '3', '4', '5'];

  filtersForm: FormGroup = new FormGroup({
    customerId: new FormControl(''),
    customersGrade: new FormControl<string[]>([]),
    userId: new FormControl(''),
    capital: new FormControl('C'),
    loanState: new FormControl(''),
    feeState: new FormControl(''),
    dateRange: new FormControl<[Date, Date] | Date | null>(null)
  });

  // Customer search signals
  customerSearchResults = signal<Customer[]>([]);
  isCustomerSearchLoading = signal(false);

  // User search signals
  userSearchResults = signal<LocalUser[]>([]);
  isUserSearchLoading = signal(false);

  isLoading = signal(false);
  reportCustomers = signal<ReportCustomer[]>([]);
  error = signal<string | null>(null);
  currentPage = signal(1);
  readonly pageSize = 10;
  totalItems = signal(0);
  totalCapital = signal(0);
  selectedDateRange = signal<[Date, Date] | null>(null);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  rangeStart = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.totalItems()));
  formattedDateRange = computed(() => {
    const dateRange = this.selectedDateRange();

    if (!dateRange?.[0] || !dateRange?.[1]) return 'Sin período seleccionado';

    const format = (date: Date) => date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    return `${format(dateRange[0])} - ${format(dateRange[1])}`;
  });

  datePresets: Record<string, [Date, Date]> = {
    'Hoy': [
      new Date(new Date().setHours(0, 0, 0, 0)),
      new Date(new Date().setHours(23, 59, 59, 999))
    ],
    'Esta semana': [
      new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
      new Date()
    ],
    'Este mes': [
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date()
    ],
    'Este año': [
      new Date(new Date().getFullYear(), 0, 1),
      new Date()
    ]
  };

  getCustomers!: () => void;
  searchCustomers!: (search: string) => void;
  searchUsers!: (search: string) => void;

  constructor() { }

  ngOnInit() {
    this.filtersForm.get('dateRange')?.valueChanges.subscribe(value => {
      this.selectedDateRange.set(value ?? null);
    });

    this.getCustomers = this.generalService.debounce(() => {
      this.currentPage.set(1);
      this.fetchCustomers();
    });

    this.searchCustomers = this.generalService.debounce((search: string) => {
      this.fetchCustomerOptions(search);
    }, 400);

    this.searchUsers = this.generalService.debounce((search: string) => {
      this.fetchUserOptions(search);
    }, 400);

    this.fetchCustomers();
    this.fetchCustomerOptions();
    this.fetchUserOptions();
  }

  onCustomerSearch(search: string): void {
    this.isCustomerSearchLoading.set(true);
    this.searchCustomers(search);
  }

  private fetchCustomerOptions(search: string = ''): void {
    this.isCustomerSearchLoading.set(true);

    this.customersService.getCustomers(search, 1, 20).subscribe({
      next: ({ data }) => {
        this.customerSearchResults.set(data);
        this.isCustomerSearchLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isCustomerSearchLoading.set(false);
      }
    });
  }

  onUserSearch(search: string): void {
    this.isUserSearchLoading.set(true);
    this.searchUsers(search);
  }

  private fetchUserOptions(search: string = ''): void {
    this.isUserSearchLoading.set(true);

    this.reportsService.getUsers(search, 1, 20).subscribe({
      next: ({ data }) => {
        this.userSearchResults.set(data);
        this.isUserSearchLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isUserSearchLoading.set(false);
      }
    });
  }

  getCustomerFullName(customer: Customer): string {
    return [customer.first_name, customer.last_names]
      .filter(Boolean)
      .join(' ');
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

  getGradeLabel(grade: PaymentGrade): string {
    const labels: Record<PaymentGrade, string> = {
      '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E'
    };
    return labels[grade];
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

  getLoanStateClasses(state: LoanStateAcronym): string {
    switch (state) {
      case 'A': return 'border-green-500 text-green-700 bg-green-100';
      case 'IP': return 'border-orange-400 text-orange-700 bg-orange-100';
      case 'R': return 'border-red-500 text-red-700 bg-red-100';
      case 'C': return 'border-purple-500 text-purple-700 bg-purple-100';
      default: return 'border-gray-300 text-gray-600 bg-gray-100';
    }
  }

  onGradeChange(grade: PaymentGrade): void {
    const currentGrades = this.filtersForm.get('customersGrade')?.value as PaymentGrade[];
    const updatedGrades = currentGrades.includes(grade)
      ? currentGrades.filter(g => g !== grade)
      : [...currentGrades, grade];

    this.filtersForm.get('customersGrade')?.setValue(updatedGrades);
  }

  isGradeSelected(grade: PaymentGrade): boolean {
    const currentGrades = this.filtersForm.get('customersGrade')?.value as PaymentGrade[];
    return currentGrades.includes(grade);
  }

  private fetchCustomers() {
    this.isLoading.set(true);
    this.error.set(null);

    const { customerId, customersGrade, userId, loanState, feeState, dateRange } = this.filtersForm.value;

    /* TODO: Fix filtering by states, capital range and date */
    console.log(this.filtersForm.value);

    this.reportsService.getReportCustomers({
      customerId: customerId || undefined,
      customersGrade: customersGrade?.length ? customersGrade : undefined,
      userId: userId || undefined,
      loanState: loanState || undefined,
      feeState: feeState || undefined,
      dateRange: dateRange || undefined,
      page: this.currentPage(),
      pageSize: this.pageSize
    }).subscribe({
      next: ({ data, total, totalCapital }) => {
        this.reportCustomers.set(data);
        this.totalItems.set(total);
        this.totalCapital.set(totalCapital);
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
      case 'Active': return 'var(--success)';
      case 'Inactive': return 'var(--warning)';
      case 'Blocked': return 'var(--error)';
      default: return 'gray';
    }
  }

  generateReport(): void {
    this.isLoading.set(true);

    const { customerId, customersGrade, userId, loanState, feeState, dateRange } = this.filtersForm.value;

    this.reportsService.getReportCustomers({
      customerId: customerId || undefined,
      customersGrade: customersGrade?.length ? customersGrade : undefined,
      userId: userId || undefined,
      loanState: loanState || undefined,
      feeState: feeState || undefined,
      dateRange: dateRange || undefined,
      page: 1,
      pageSize: 99999 // Fetch all records for the export
    }).subscribe({
      next: ({ data, totalCapital }) => {
        this.excelService.generateReportExcel(
          data,
          totalCapital,
          this.formattedDateRange()
        );
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Error generando reporte');
        this.isLoading.set(false);
      }
    });
  }
}