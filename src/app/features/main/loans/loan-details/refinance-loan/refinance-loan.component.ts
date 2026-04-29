import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NgZorroModule } from '../../../../../shared/modules/ng-zorro.module';
import { Loan } from '../../../../../core/interfaces/loans.interface';
import { LoanAction } from '../../../../../core/types/loan-action';
import { RefinanceLoanFormComponent } from './refinance-loan-form/refinance-loan-form.component';
import { LoansService } from '../../../../../core/services/pages/loans.service';

@Component({
  selector: 'app-refinance-loan',
  templateUrl: './refinance-loan.component.html',
  imports: [CommonModule, NgZorroModule, ReactiveFormsModule, RefinanceLoanFormComponent],
})
export class RefinanceLoanDrawerComponent implements OnInit {
  @Input() loan!: Loan;
  @Input() action!: { value: LoanAction; label: string };
  @Output() loanRefinanced = new EventEmitter<string>();

  // Convert to signal so Angular tracks mutations from outside the zone
  isVisible = signal(false);
  canRefinance = signal(false);

  // ── Early payment preview ─────────────────────────────────────────────────
  earlyPaymentPreview = signal<number | null>(null);
  isLoadingPreview = signal(false);
  previewError = signal(false);

  constructor(
    private modal: NzModalService,
    private loansService: LoansService
  ) { }

  ngOnInit(): void {
    this.canRefinance.set(this.loan.paid_fees / this.loan.fees >= 0.70);
    this.fetchEarlyPaymentPreview();
  }

  /** Call this from the parent whenever loan data changes */
  refresh(): void {
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

  openDrawer(): void {
    if (!this.canRefinance()) return;

    this.modal.confirm({
      nzTitle: '¿Refinanciar este préstamo?',
      nzContent: `
        <ul class="space-y-2 text-sm text-gray-600 mt-2">
          <li>• Esta acción <strong>no se puede deshacer</strong>.</li>
          <li>• El préstamo actual será <strong>liquidado anticipadamente</strong>.</li>
          <li>• Las cuotas futuras se cerrarán <strong>sin interés</strong>.</li>
          <li>• El saldo pendiente
              (<strong>${this.earlyPaymentPreview()?.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</strong>)
              será descontado del nuevo préstamo.</li>
          <li>• El nuevo préstamo nacerá en estado <strong>Aceptado</strong> y generará sus cuotas de inmediato.</li>
        </ul>
      `,
      nzOkText: 'Entendido, continuar',
      nzCancelText: 'Cancelar',
      nzOnOk: () => this.isVisible.set(true)  // signal write → always triggers CD
    });
  }

  onFormSubmitted(newLoanId: string): void {
    this.closeDrawer();
    this.loanRefinanced.emit(newLoanId);
  }

  closeDrawer(): void {
    this.isVisible.set(false);
  }
}