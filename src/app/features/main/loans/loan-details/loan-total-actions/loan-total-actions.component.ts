import {
  Component, Input, Output, EventEmitter,
  signal, TemplateRef, ViewChild, OnInit   // ← add OnInit
} from '@angular/core';
import { Loan } from '../../../../../core/interfaces/loans.interface';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CommonModule } from '@angular/common';
import { NgZorroModule } from '../../../../../shared/modules/ng-zorro.module';
import { FormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../../../shared/components/web-icon.component';
import { LoanAction } from '../../../../../core/types/loan-action';
import { RefinanceLoanDrawerComponent } from '../refinance-loan/refinance-loan.component';
import { LoansService } from '../../../../../core/services/pages/loans.service';

@Component({
  selector: 'app-loan-total-actions',
  templateUrl: './loan-total-actions.component.html',
  imports: [
    CommonModule,
    NgZorroModule,
    FormsModule,
    WebIconComponent,
    RefinanceLoanDrawerComponent
  ],
})
export class LoanTotalActionsComponent implements OnInit {
  @Input() loan!: Loan;
  @Output() loanPaid = new EventEmitter<void>();
  @Output() loanRefinanced = new EventEmitter<string>();

  @ViewChild('confirmModalTpl') confirmModalTpl!: TemplateRef<any>;

  isDropdownOpen = signal(false);
  pendingAction = signal<LoanAction | null>(null);
  isLoading = signal(false);

  // ── Early payment preview ─────────────────────────────────────────────────
  earlyPaymentPreview = signal<number | null>(null);
  isLoadingPreview = signal(false);
  previewError = signal(false);

  readonly actions: { value: LoanAction; label: string }[] = [
    { value: 'pay_full', label: 'Pagar por completo' },
    { value: 'refinance', label: 'Refinanciar' },
  ];

  get pendingActionLabel(): string {
    return this.actions.find(a => a.value === this.pendingAction())?.label ?? '';
  }

  constructor(
    private modal: NzModalService,
    private message: NzMessageService,
    private loansService: LoansService
  ) { }

  ngOnInit(): void {
    this.fetchEarlyPaymentPreview();
  }

  fetchEarlyPaymentPreview(): void {
    this.isLoadingPreview.set(true);
    this.previewError.set(false);

    this.loansService.previewEarlyPayment(this.loan.id).subscribe({
      next: (amount) => {
        this.earlyPaymentPreview.set(amount);
        this.isLoadingPreview.set(false);
      },
      error: (err) => {
        console.error('Error fetching early payment preview:', err);
        this.previewError.set(true);
        this.isLoadingPreview.set(false);
      }
    });
  }

  /** Call this from the parent whenever loan data changes */
  refresh(): void {
    this.fetchEarlyPaymentPreview();
  }

  selectAction(action: LoanAction): void {
    this.pendingAction.set(action);
    this.isDropdownOpen.set(false);
    this.openConfirmModal();
  }

  private openConfirmModal(): void {
    const modalRef = this.modal.create({
      nzTitle: this.pendingActionLabel,
      nzContent: this.confirmModalTpl,
      nzFooter: [
        {
          label: 'Cancelar',
          type: 'default',
          onClick: () => {
            this.pendingAction.set(null);
            modalRef.close();
          }
        },
        {
          label: 'Confirmar',
          type: 'primary',
          loading: () => this.isLoading(),
          disabled: () => this.isLoading() || this.isLoadingPreview(),
          onClick: () => this.confirmAction(modalRef)
        }
      ],
      nzOnCancel: () => this.pendingAction.set(null)
    });
  }

  private confirmAction(modalRef: ReturnType<NzModalService['create']>): void {
    const action = this.pendingAction();

    if (action === 'pay_full') {
      this.isLoading.set(true);

      this.loansService.payLoanEarly(this.loan.id).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.pendingAction.set(null);
          modalRef.close();
          this.message.success('Préstamo liquidado exitosamente.');
          this.loanPaid.emit();
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error al liquidar el préstamo:', err);
          this.message.error('Ocurrió un error al liquidar el préstamo. Intente de nuevo.');
        }
      });

    } else if (action === 'refinance') {
      console.log('TODO: Gets done through it drawer component refinance-loan-form ->', this.loan.id);
      this.pendingAction.set(null);
      modalRef.close();
    }
  }
}