import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../shared/modules/ng-zorro.module';
import { GeneralService } from '../../../core/services/general.service';
import { ReportCustomer } from '../../../core/interfaces/report-customers.interface';
import { LoanStateAcronym } from '../../../core/types/loan-state.type';
import { LocalUser } from '../../../core/interfaces/users.interface';
import { ReportsService } from '../../../core/services/pages/reports.service';
import { PaymentGrade } from '../../../core/types/payment-grade.type';
import { ExcelService } from '../../../core/services/pages/excel.service';
import { EntitiesService } from '../../../core/services/pages/entities.service';
import { Entity } from '../../../core/types/entity.type';
import { ReportFilters } from '../../../core/interfaces/report-filters.interface';

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
  private entitiesService = inject(EntitiesService);
  private reportsService = inject(ReportsService);
  private excelService = inject(ExcelService);

  readonly grades: PaymentGrade[] = ['1', '2', '3', '4', '5'];

  filtersForm = new FormGroup({
    customerId: new FormControl(''),
    customersGrade: new FormControl<string[]>([]),
    userId: new FormControl(''),
    capital: new FormControl(''),
    loanState: new FormControl(''),
    feeState: new FormControl(''),
    dateRange: new FormControl<[Date, Date] | null>(null),
    dateRangeTarget: new FormControl<'next_payment' | 'fee_date'>('next_payment')
  });

  // Search signals
  entitiesSearchResults = signal<Entity[]>([]);
  isEntitySearchLoading = signal(false);
  userSearchResults = signal<LocalUser[]>([]);
  isUserSearchLoading = signal(false);

  // Table signals
  isLoading = signal(false);
  reportCustomers = signal<ReportCustomer[]>([]);
  error = signal<string | null>(null);
  currentPage = signal(1);
  totalItems = signal(0);
  totalCapital = signal(0);

  readonly pageSize = 10;

  // Computed
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize))
  );
  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );
  rangeStart = computed(() =>
    this.totalItems() === 0
      ? 0
      : (this.currentPage() - 1) * this.pageSize + 1
  );
  rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.totalItems())
  );

  selectedDateRange = signal<[Date, Date] | null>(null);

  formattedDateRange = computed(() => {
    const dr = this.selectedDateRange();
    if (!dr?.[0] || !dr?.[1]) return 'Sin período seleccionado';

    const fmt = (d: Date) =>
      d.toLocaleDateString('es-HN', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

    return `${fmt(dr[0])} - ${fmt(dr[1])}`;
  });

  hasActiveFilters = computed(() => {
    const {
      customerId, customersGrade, userId,
      capital, loanState, feeState, dateRange
    } = this.filtersForm.value;

    return !!(
      customerId ||
      customersGrade?.length ||
      userId ||
      capital ||
      loanState ||
      feeState ||
      dateRange
    );
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

  // Debounced functions
  getCustomers!: () => void;
  searchCustomers!: (search: string) => void;
  searchUsers!: (search: string) => void;

  ngOnInit(): void {
    this.filtersForm.get('dateRange')?.valueChanges.subscribe(value => {
      this.selectedDateRange.set(
        Array.isArray(value) ? value as [Date, Date] : null
      );
    });

    this.getCustomers = this.generalService.debounce(() => {
      this.currentPage.set(1);
      this.fetchCustomers();
    });

    this.searchCustomers = this.generalService.debounce(
      (search: string) => this.fetchEntitiesOptions(search),
      400
    );

    this.searchUsers = this.generalService.debounce(
      (search: string) => this.fetchUserOptions(search),
      400
    );

    this.fetchCustomers();
    this.fetchEntitiesOptions();
    this.fetchUserOptions();
  }

  // ── Search handlers ──────────────────────────────────────────────────────

  onCustomerSearch(search: string): void {
    this.isEntitySearchLoading.set(true);
    this.searchCustomers(search);
  }

  onUserSearch(search: string): void {
    this.isUserSearchLoading.set(true);
    this.searchUsers(search);
  }

  private fetchEntitiesOptions(search = ''): void {
    this.isEntitySearchLoading.set(true);
    this.entitiesService.getEntities(search, 1, 20).subscribe({
      next: ({ data }) => {
        this.entitiesSearchResults.set(data);
        this.isEntitySearchLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isEntitySearchLoading.set(false);
      }
    });
  }

  private fetchUserOptions(search = ''): void {
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

  // ── Filters ──────────────────────────────────────────────────────────────

  private buildFilters(): ReportFilters {
    const {
      customerId, customersGrade, userId,
      capital, loanState, feeState,
      dateRange, dateRangeTarget
    } = this.filtersForm.value;

    return {
      customerId: customerId || undefined,
      customersGrade: customersGrade?.length ? customersGrade : undefined,
      userId: userId || undefined,
      capitalRange: (capital as 'A' | 'B' | 'C') || undefined,
      loanState: loanState || undefined,
      feeState: feeState || undefined,
      dateRange: dateRange || undefined,
      dateRangeTarget: dateRangeTarget || 'next_payment'
    };
  }

  resetFilters(): void {
    this.filtersForm.reset({
      customerId: '',
      customersGrade: [],
      userId: '',
      capital: '',
      loanState: '',
      feeState: '',
      dateRange: null,
      dateRangeTarget: 'next_payment'
    });
    this.selectedDateRange.set(null);
    this.currentPage.set(1);
    this.fetchCustomers();
  }

  onGradeChange(grade: PaymentGrade): void {
    const current = this.filtersForm.get('customersGrade')?.value as PaymentGrade[];
    const updated = current.includes(grade)
      ? current.filter(g => g !== grade)
      : [...current, grade];
    this.filtersForm.get('customersGrade')?.setValue(updated);
  }

  isGradeSelected(grade: PaymentGrade): boolean {
    return (
      this.filtersForm.get('customersGrade')?.value as PaymentGrade[]
    ).includes(grade);
  }

  // ── Data fetching ────────────────────────────────────────────────────────

  private fetchCustomers(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.reportsService
      .getReportCustomers({
        ...this.buildFilters(),
        page: this.currentPage(),
        pageSize: this.pageSize
      })
      .subscribe({
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

  generateReport(): void {
    this.isLoading.set(true);

    this.reportsService
      .getReportCustomers({
        ...this.buildFilters(),
        page: 1,
        pageSize: 99999
      })
      .subscribe({
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

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchCustomers();
  }

  // ── Display helpers ──────────────────────────────────────────────────────

  getFullName(customer: ReportCustomer): string {
    return [customer.first_name, customer.second_name, customer.last_names]
      .filter(Boolean)
      .join(' ');
  }

  getCustomerFullName(entity: Entity): string {
    return [entity.first_name, entity.last_names]
      .filter(Boolean)
      .join(' ');
  }

  getGradeLabel(grade: PaymentGrade): string {
    const labels: Record<PaymentGrade, string> = {
      '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E'
    };
    return labels[grade];
  }

  getLoanStateLabel(state: LoanStateAcronym): string {
    const labels: Record<LoanStateAcronym, string> = {
      'A': 'Aprobado',
      'IP': 'En Proceso',
      'R': 'Rechazado',
      'C': 'Cerrado'
    };
    return labels[state] ?? state;
  }

  getLoanStateClasses(state: LoanStateAcronym): string {
    const classes: Record<LoanStateAcronym, string> = {
      'A': 'border-green-500  text-green-700  bg-green-100',
      'IP': 'border-orange-400 text-orange-700 bg-orange-100',
      'R': 'border-red-500    text-red-700    bg-red-100',
      'C': 'border-purple-500 text-purple-700 bg-purple-100'
    };
    return classes[state] ?? 'border-gray-300 text-gray-600 bg-gray-100';
  }

  getStateColor(state: string): string {
    const colors: Record<string, string> = {
      'Active': 'var(--success)',
      'Inactive': 'var(--warning)',
      'Blocked': 'var(--error)'
    };
    return colors[state] ?? 'gray';
  }
}