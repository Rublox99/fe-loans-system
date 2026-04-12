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

export interface CardDef {
  title: string;
  value: number;
  accent: string;
  label?: { text: string; bg: string; };
}

@Component({
  selector: 'app-main',
  templateUrl: './customers.component.html',
  styleUrls: ['../main.styles.css', './customers.styles.css'],
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
export class CustomersComponent implements OnInit {
  private generalService = inject(GeneralService);
  private entitiesService = inject(EntitiesService);

  searchText = '';
  isLoading = signal(false);
  isStatsLoading = signal(false);
  customers = signal<Customer[]>([]);
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
      this.fetchCustomers();
    });

    this.fetchCustomers();
    this.fetchStats();
  }

  onEntityChanged(): void {
    this.fetchCustomers();
    this.fetchStats();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchCustomers();
  }

  getFullName(customer: Customer): string {
    return [customer.first_name, customer.second_name, customer.last_names]
      .filter(Boolean)
      .join(' ');
  }

  getGradeLabel(grade: string): string {
    const labels: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
    return labels[grade] ?? grade;
  }

  getStateColor(state: string): string {
    switch (state) {
      case 'Active': return 'var(--success)';
      case 'Inactive': return 'var(--warning)';
      case 'Blocked': return 'var(--error)';
      default: return 'gray';
    }
  }

  getSpouseLabel(customer: Customer): string {
    if (!customer.spouse) return 'N/A';

    const name = [
      customer.spouse.first_name,
      customer.spouse.second_name,
      customer.spouse.last_names
    ].filter(Boolean).join(' ');

    return `${name} (${customer.spouse.dni})`;
  }

  fetchCustomers() {
    this.isLoading.set(true);
    this.error.set(null);

    this.entitiesService.getCustomers(this.searchText, this.currentPage(), this.pageSize)
      .subscribe({
        next: ({ data, total }) => {
          this.customers.set(data);
          this.totalItems.set(total);
          this.isLoading.set(false);

          console.log(this.customers());

        },
        error: (err) => {
          console.error(err);
          this.error.set('Error cargando clientes');
          this.isLoading.set(false);
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