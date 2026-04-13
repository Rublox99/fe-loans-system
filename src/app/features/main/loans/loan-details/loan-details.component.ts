import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { CommonModule } from '@angular/common';
import { ViewEntityDrawerComponent } from '../../customers/view-entity/view-entity.component';
import { HandleFeeDrawerComponent } from '../handle-fee/handle-fee.component';
import { Fee } from '../../../../core/interfaces/fees.interface';
import { FeesService } from '../../../../core/services/pages/fees.service';
import { FormsModule } from '@angular/forms';
import { Loan } from '../../../../core/interfaces/loans.interface';
import { LoansService } from '../../../../core/services/pages/loans.service';
import { FeeState } from '../../../../core/types/fee-state';
import { LoanState } from '../../../../core/types/loan-state.type';
import { GeneralService } from '../../../../core/services/general.service';

export interface LoanStateOption {
  value: LoanState;
  label: string;
  colorClass: string;
}

@Component({
  selector: 'app-loan-details',
  templateUrl: './loan-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-1 min-h-0 overflow-hidden' },
  imports: [
    CommonModule,
    WebIconComponent,
    FormsModule,
    NgZorroModule,
    ViewEntityDrawerComponent,
    HandleFeeDrawerComponent
  ],
  styleUrls: ['./loan-details.component.css', '../../main.styles.css']
})
export class LoanDetailsComponent implements OnInit {
  loanId!: string;
  loan = signal<Loan | null>(null);
  currentPendingFee = signal<Fee | null>(null);

  searchText = '';
  isLoadingTable = signal(false);
  isLoadingLoan = signal(false);
  isUpdatingState = signal(false);
  fees = signal<Fee[]>([]);
  errorFeeDetails = signal<string | null>(null);
  errorLoan = signal<string | null>(null);
  currentPage = signal(1);
  readonly pageSize = 10;
  totalItems = signal(0);

  availableLoanStateOptions = computed(() => {
    const current = this.selectedLoanState();
    // Only allow transitions from 'Under Review'
    if (current !== 'Under Review') return [];
    return [
      { value: 'Accepted' as LoanState, label: 'Aceptado', colorClass: 'loan-state--accepted' },
      { value: 'Under Review' as LoanState, label: 'En revisión', colorClass: 'loan-state--under-review' },
      { value: 'Denied' as LoanState, label: 'Rechazado', colorClass: 'loan-state--denied' }
    ];
  });

  readonly loanStateOptions: LoanStateOption[] = [
    { value: 'Accepted', label: 'Aceptado', colorClass: 'loan-state--accepted' },
    { value: 'Under Review', label: 'En revisión', colorClass: 'loan-state--under-review' },
    { value: 'Denied', label: 'Rechazado', colorClass: 'loan-state--denied' },
    { value: 'Paid', label: 'Cerrado', colorClass: 'loan-state--paid' }
  ];

  selectedLoanState = signal<LoanState | null>(null);

  selectedStateColorClass = computed(() =>
    this.loanStateOptions.find(o => o.value === this.selectedLoanState())?.colorClass ?? ''
  );

  // ── Cards (derived from loan signal) ─────────────────────────────────
  totalPaid = computed(() => {
    const l = this.loan();
    if (!l) return 0;
    return l.fee_value * l.paid_fees;
  });

  remainingBalance = computed(() => this.loan()?.capital_balance ?? 0);

  // ── Pagination ────────────────────────────────────────────────────────
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  rangeStart = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.totalItems()));

  getFeeDetails!: () => void;

  constructor(
    private route: ActivatedRoute,
    private feesService: FeesService,
    private loansService: LoansService,
    private generalService: GeneralService
  ) { }

  ngOnInit(): void {
    this.loanId = this.route.snapshot.paramMap.get('id')!;

    this.getFeeDetails = this.generalService.debounce(() => {
      this.currentPage.set(1);
      this.fetchFeeDetails();
    }, 350);

    this.fetchLoanDetails();
    this.fetchFeeDetails();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchFeeDetails();
  }

  onFeeUpdated(): void {
    this.fetchLoanDetails(); // refreshes cards (capital_balance, next_expected_payment etc.)
    this.fetchFeeDetails();  // refreshes the fees table
  }

  onLoanStateChange(newState: LoanState) {
    const previousState = this.selectedLoanState();
    if (newState === previousState) return;

    this.selectedLoanState.set(newState);
    this.isUpdatingState.set(true);

    this.loansService.updateLoanState(this.loanId, newState).subscribe({
      next: () => {
        const current = this.loan();
        if (current) this.loan.set({ ...current, state: newState });
        this.isUpdatingState.set(false);

        if (newState === 'Accepted' || newState === 'Denied') {
          this.fetchFeeDetails();
        }
      },
      error: (err) => {
        console.error('Error updating loan state:', err);
        this.selectedLoanState.set(previousState);
        this.isUpdatingState.set(false);
      }
    });
  }

  getFeeStateLabel(state: FeeState): string {
    switch (state) {
      case '1': return 'Pendiente';
      case '2': return 'Mora';
      case '3': return 'Pagada';
      default: return state;
    }
  }

  getFeeStateClasses(state: FeeState): string {
    switch (state) {
      case '1': return 'border-orange-400 text-orange-700 bg-orange-100';
      case '2': return 'border-red-500 text-red-700 bg-red-100';
      case '3': return 'border-blue-500 text-blue-700 bg-blue-100';
      default: return 'border-gray-300 text-gray-600 bg-gray-100';
    }
  }

  fetchLoanDetails() {
    this.isLoadingLoan.set(true);
    this.errorLoan.set(null);

    this.loansService.getLoanById(this.loanId).subscribe({
      next: (loan) => {
        this.loan.set(loan ?? null);
        this.selectedLoanState.set(loan?.state ?? null);
        this.isLoadingLoan.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorLoan.set('Error cargando detalles del préstamo');
        this.isLoadingLoan.set(false);
      }
    });
  }

  fetchFeeDetails() {
    this.isLoadingTable.set(true);
    this.errorFeeDetails.set(null);

    this.feesService.getFeesByLoanId(
      this.loanId,
      this.searchText,
      this.currentPage(),
      this.pageSize
    ).subscribe({
      next: ({ data, total }) => {
        this.fees.set(data);
        this.totalItems.set(total);

        console.log(this.fees())

        // Picks first pending fee for the handle-fee drawer
        this.currentPendingFee.set(
          data.find(f => f.fee_state === '1') ?? null
        );

        this.isLoadingTable.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorFeeDetails.set('Error cargando cuotas');
        this.isLoadingTable.set(false);
      }
    });
  }
}