import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { CommonModule } from '@angular/common';
import { ViewEntityDrawerComponent } from '../../customers/view-entity/view-entity.component';
import { HandleFeeDrawerComponent } from '../handle-fee/handle-fee.component';
import { Fee } from '../../../../core/interfaces/fees.interface';
import { FeesService } from '../../../../core/services/fees.service';
import { FormsModule } from '@angular/forms';
import { Loan } from '../../../../core/interfaces/loans.interface';
import { LoansService } from '../../../../core/services/loans.service';
import { FeeState } from '../../../../core/types/fee-state';
import { LoanState } from '../../../../core/types/loan-state.type';

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
  loan: Loan | null = null;
  currentPendingFee: Fee | null = null;

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

  readonly loanStateOptions: LoanStateOption[] = [
    { value: 'Accepted', label: 'Aceptado', colorClass: 'loan-state--accepted' },
    { value: 'Under Review', label: 'En proceso', colorClass: 'loan-state--under-review' },
    { value: 'Denied', label: 'Rechazado', colorClass: 'loan-state--denied' },
    { value: 'Paid', label: 'Pagado', colorClass: 'loan-state--paid' },
  ];

  selectedLoanState = signal<LoanState | null>(null);

  selectedStateColorClass = computed(() => {
    return this.loanStateOptions.find(o => o.value === this.selectedLoanState())?.colorClass ?? '';
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize)));
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  rangeStart = computed(() => this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.totalItems()));

  getFeeDetails!: () => void;

  constructor(
    private route: ActivatedRoute,
    private feesService: FeesService,
    private loansService: LoansService
  ) { }

  ngOnInit(): void {
    this.loanId = this.route.snapshot.paramMap.get('id')!;

    this.getFeeDetails = () => {
      this.currentPage.set(1);
      this.fetchFeeDetails();
    }

    this.fetchLoanDetails();
    this.fetchFeeDetails();

    const pendingFee = this.fees().find(fee => fee.fee_state === '1');
    this.currentPendingFee = pendingFee || null;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchFeeDetails();
  }

  onLoanStateChange(newState: LoanState) {
    const previousState = this.selectedLoanState();
    this.selectedLoanState.set(newState);
    this.isUpdatingState.set(true);

    this.updateLoanState(newState, previousState);
  }

  private updateLoanState(newState: LoanState, previousState: LoanState | null) {
    // TODO: connect to Supabase
    // On error, roll back: this.selectedLoanState.set(previousState);
    // this.isUpdatingState.set(false);
  }

  getFeeStateLabel(state: FeeState): string {
    switch (state) {
      case '1': return 'Pendiente';
      case '2': return 'Pagada';
      case '3': return 'Mora';
      default: return state;
    }
  }

  getFeeStateClasses(state: FeeState): string {
    switch (state) {
      case '1': return 'border-orange-400 text-orange-700 bg-orange-100';
      case '2': return 'border-blue-500 text-blue-700 bg-blue-100';
      case '3': return 'border-red-500 text-red-700 bg-red-100';
      default: return 'border-gray-300 text-gray-600 bg-gray-100';
    }
  }

  fetchLoanDetails() {
    this.isLoadingLoan.set(true);

    this.loansService.getLoanById(this.loanId)
      .subscribe({
        next: (loan) => {
          this.loan = loan || null;
          this.selectedLoanState.set(loan?.state ?? null); // 👈 new: seed the signal
          this.isLoadingLoan.set(false);
        },
        error: (err) => {
          console.error(err);
          this.errorLoan.set('Error cargando detalles del préstamo');
        }
      });
  }

  fetchFeeDetails() {
    this.isLoadingTable.set(true);
    this.errorFeeDetails.set(null);

    this.feesService.getFeesByLoanId(this.loanId, this.searchText, this.currentPage(), this.pageSize)
      .subscribe({
        next: ({ data, total }) => {
          this.fees.set(data);
          this.totalItems.set(total);
          this.isLoadingTable.set(false);
        },
        error: (err) => {
          console.error(err);
          this.errorFeeDetails.set('Error cargando clientes');
          this.isLoadingTable.set(false);
        }
      });
  }
}