import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../shared/modules/ng-zorro.module';
import { Customer } from '../../../core/interfaces/customers.interface';
import { CustomerStats, EntitiesService } from '../../../core/services/pages/entities.service';
import { GeneralService } from '../../../core/services/general.service';
import { ViewEntityDrawerComponent } from './view-entity/view-entity.component';
import { AddEntityDrawerComponent } from './add-entity/add-entity.component';
import { EditEntityDrawerComponent } from './edit-entity/edit-entity.component';
import { Entity, EntityKind } from '../../../core/types/entity.type';
import { LoanSummary } from '../../../core/interfaces/loans.interface';

export interface CardDef {
  title: string;
  value: number;
  accent: string;
  label?: { text: string; bg: string; };
}

@Component({
  selector: 'app-main',
  templateUrl: './entities.component.html',
  styleUrls: ['../main.styles.css', './entities.styles.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 min-h-0 overflow-hidden' },
  imports: [
    WebIconComponent,
    AddEntityDrawerComponent,
    EditEntityDrawerComponent,
    ViewEntityDrawerComponent,
    FormsModule,
    NgZorroModule
  ]
})
export class EntitiessComponent implements OnInit {
  private generalService = inject(GeneralService);
  private entitiesService = inject(EntitiesService);

  searchText = '';
  isLoading = signal(false);
  isStatsLoading = signal(false);
  entities = signal<Entity[]>([]);
  loanSummaries = signal<Map<string, LoanSummary>>(new Map());
  isLoanSummaryLoading = signal(false);
  error = signal<string | null>(null);
  currentPage = signal(1);
  readonly pageSize = 10;
  totalItems = signal(0);

  stats = signal<CustomerStats>({
    totalActive: 0,
    gradeA: 0,
    gradeBC: 0,
    gradeDE: 0,
    newThisMonth: 0
  });

  // Derives the card definitions from the stats signal
  cardDefs = computed<CardDef[]>(() => {
    const s = this.stats();
    return [
      {
        title: 'Activos totales',
        value: s.totalActive,
        accent: '#3870B5'
      },
      {
        title: 'Clientes - Grado A',
        value: s.gradeA,
        accent: '#0A7040'
      },
      {
        title: 'Clientes - Grado B/C',
        value: s.gradeBC,
        accent: '#FFA719',
        label: { text: 'En observación', bg: '#ffedd0' }
      },
      {
        title: 'Clientes - Grado D/E',
        value: s.gradeDE,
        accent: '#E31B54',
        label: { text: 'En riesgo', bg: '#ffc1d2' }
      },
      {
        title: 'Nuevos este mes',
        value: s.newThisMonth,
        accent: '#9747FF',
        label: { text: 'Adquisiciones', bg: '#d6b7ff' }
      }
    ];
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  rangeStart = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.totalItems()));

  getCustomers!: () => void;

  ngOnInit() {
    this.getCustomers = this.generalService.debounce(() => {
      this.currentPage.set(1);
      this.fetchEntities();
    });

    this.fetchEntities();
    this.fetchStats();
  }

  onEntityChanged(): void {
    this.fetchEntities();
    this.fetchStats();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchEntities();
  }

  isCustomer(entity: Entity): entity is Customer & { _kind: 'C' } {
    return entity._kind === 'C';
  }

  getEntityKindLabel(entity: Entity): string {
    return entity._kind === 'C' ? 'Cliente' : 'Aval';
  }

  getFullName(entity: Entity): string {
    return [entity.first_name, entity.second_name, entity.last_names]
      .filter(Boolean)
      .join(' ');
  }

  getGradeLabel(grade: string): string {
    const labels: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
    return labels[grade] ?? grade;
  }

  getStateColor(entity: Entity): string {
    if (!this.isCustomer(entity)) return 'gray'; // Guarantee persons have no state field
    switch (entity.state) {
      case 'Active': return 'var(--success)';
      case 'Inactive': return 'var(--warning)';
      case 'Blocked': return 'var(--error)';
      default: return 'gray';
    }
  }

  getSpouseLabel(entity: Entity): string {
    if (!this.isCustomer(entity)) return 'N/A';
    const c = entity;
    if (!c.spouse) return 'N/A';
    const name = [c.spouse.first_name, c.spouse.second_name, c.spouse.last_names]
      .filter(Boolean).join(' ');
    return `${name} (${c.spouse.dni})`;
  }

  getLoanSummary(entity: Entity): LoanSummary | null {
    if (!this.isCustomer(entity)) return null;
    return this.loanSummaries().get(entity.id) ?? null;
  }

  formatTotalBalance(entity: Entity): string {
    if (!this.isCustomer(entity)) return 'N/A';
    if (this.isLoanSummaryLoading()) return '—';
    const summary = this.loanSummaries().get(entity.id);
    if (!summary || summary.totalBalance === 0) return 'L 0.00';
    return `L ${summary.totalBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  formatLastPayment(entity: Entity): string {
    if (!this.isCustomer(entity)) return 'N/A';
    if (this.isLoanSummaryLoading()) return '—';
    const summary = this.loanSummaries().get(entity.id);
    if (!summary?.lastPaymentDate) return 'Sin pagos';
    return new Date(summary.lastPaymentDate).toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  fetchEntities() {
    this.isLoading.set(true);
    this.error.set(null);

    this.entitiesService
      .getEntities(this.searchText, this.currentPage(), this.pageSize, true)
      .subscribe({
        next: ({ data, total }) => {
          this.entities.set(data);
          this.totalItems.set(total);
          this.isLoading.set(false);

          // Fetch loan summaries only for customer rows on this page
          const customerIds = data
            .filter(e => e._kind === 'C')
            .map(e => e.id);

          this.fetchLoanSummaries(customerIds);
        },
        error: (err) => {
          console.error(err);
          this.error.set('Error cargando entidades');
          this.isLoading.set(false);
        }
      });
  }

  private fetchLoanSummaries(customerIds: string[]): void {
    // Clear stale data immediately so previous page values don't linger
    this.loanSummaries.set(new Map());

    if (customerIds.length === 0) return;

    this.isLoanSummaryLoading.set(true);

    this.entitiesService
      .getLoanSummariesForCustomers(customerIds)
      .subscribe({
        next: (summaries) => {
          this.loanSummaries.set(summaries);
          this.isLoanSummaryLoading.set(false);
        },
        error: (err) => {
          console.error('fetchLoanSummaries error:', err);
          this.isLoanSummaryLoading.set(false);
          // Non-blocking — table still renders, columns just show '—'
        }
      });
  }


  fetchStats() {
    this.isStatsLoading.set(true);

    this.entitiesService.getCustomerStats()
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.isStatsLoading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.isStatsLoading.set(false);
        }
      });
  }
}