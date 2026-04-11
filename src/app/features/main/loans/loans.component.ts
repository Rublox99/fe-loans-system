import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { Customer } from '../../../core/interfaces/customers.interface';
import { GeneralService } from '../../../core/services/general.service';
import { CommonModule } from '@angular/common';
import { AddLoanDrawerComponent } from './add-loan/add-loan.component';
import { WebIconComponent } from '../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../shared/modules/ng-zorro.module';
import { FormsModule } from '@angular/forms';
import { LoansService } from '../../../core/services/loans.service';
import { Loan } from '../../../core/interfaces/loans.interface';
import { LoanState } from '../../../core/types/loan-state.type';
import { Router } from '@angular/router';

@Component({
  selector: 'app-loans',
  templateUrl: './loans.component.html',
  styleUrls: ['../main.styles.css', './loans.styles.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 min-h-0 overflow-hidden' },
  imports: [
    CommonModule,
    FormsModule,
    AddLoanDrawerComponent,
    WebIconComponent,
    NgZorroModule
  ]
})
export class LoansComponent implements OnInit {

  selectedLoanId = signal<string | null>(null);

  searchText = '';
  isLoading = signal(false);
  loans = signal<Loan[]>([]);
  error = signal<string | null>(null);
  currentPage = signal(1);
  readonly pageSize = 10;
  totalItems = signal(0);

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  rangeStart = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.totalItems()));

  getLoans!: () => void;

  constructor(
    private generalService: GeneralService,
    private loansService: LoansService,
    private router: Router
  ) { }

  ngOnInit() {
    this.getLoans = this.generalService.debounce(() => {
      this.currentPage.set(1);
      this.fetchLoans();
    });
    this.fetchLoans();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchLoans();
  }

  getFullName(customer: Customer): string {
    return [customer.first_name, customer.second_name, customer.last_names]
      .filter(Boolean)
      .join(' ');
  }

  getLoanStateLabel(state: LoanState): string {
    switch (state) {
      case 'Accepted': return 'Aprobado';
      case 'Under Review': return 'En Proceso';
      case 'Denied': return 'Rechazado';
      case 'Paid': return 'Cerrado';
      default: return state;
    }
  }

  getLoanStateClasses(state: LoanState): string {
    switch (state) {
      case 'Accepted': // Approved
        return 'border-green-500 text-green-700 bg-green-100';

      case 'Under Review': // In Progress
        return 'border-orange-400 text-orange-700 bg-orange-100';

      case 'Denied': // Rejected
        return 'border-red-500 text-red-700 bg-red-100';

      case 'Paid': // Closed
        return 'border-purple-500 text-purple-700 bg-purple-100';

      default:
        return 'border-gray-300 text-gray-600 bg-gray-100';
    }
  }

  selectLoan(id: string): void {
    // Toggle off if same row is clicked again
    this.selectedLoanId.set(this.selectedLoanId() === id ? null : id);
  }

  private fetchLoans() {
    this.isLoading.set(true);
    this.error.set(null);

    this.loansService.getLoans(this.searchText, this.currentPage(), this.pageSize)
      .subscribe({
        next: ({ data, total }) => {
          this.loans.set(data);
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

  goToLoanDetails() {
    if (this.selectedLoanId()) {
      this.router.navigate(['/v1/main/loans', this.selectedLoanId(), 'details']);
    }
  }
}
