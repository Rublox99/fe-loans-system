import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { Fee } from '../../../../core/interfaces/fees.interface';
import { Loan } from '../../../../core/interfaces/loans.interface';
import { FeesService } from '../../../../core/services/pages/fees.service';
import { FeeState } from '../../../../core/types/fee-state';

@Component({
  selector: 'app-handle-fee',
  standalone: true,
  templateUrl: './handle-fee.component.html',
  imports: [
    CommonModule,
    WebIconComponent,
    FormsModule,
    NgZorroModule,
    ReactiveFormsModule
  ],
  styles: `
        .section__wrapper { @apply space-y-5 }

        .section__header {
            position: relative;
            padding-left: 10px;
            @apply font-roboto text-sm font-medium uppercase text-primary
        }

        .section__header::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            @apply w-[3px] h-full bg-primary
        }

        .section__line { @apply font-sans flex gap-2.5 }
    `
})
export class HandleFeeDrawerComponent implements OnChanges {
  @Input() fee: Fee | null = null;
  @Input() loan: Loan | null = null;
  @Output() feeUpdated = new EventEmitter<void>();

  isVisible = false;
  isSubmitting = signal(false);
  useCustomDate = signal(false);

  form: FormGroup = new FormGroup({
    paymentDate: new FormControl<string>({ value: '', disabled: true }),
    expirationDate: new FormControl<string>({ value: '', disabled: true }),
    paymentAmount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ]),
  });

  constructor(private feesService: FeesService) { }

  // ─── Computed helpers ────────────────────────────────────────────────────────

  /** How much has already been paid toward this fee */
  get alreadyPaid(): number {
    return this.fee?.paid_amount ?? 0;
  }

  /** How much is left to fully settle this fee */
  get remainingAmount(): number {
    return Math.max(0, (this.loan?.fee_value ?? 0) - this.alreadyPaid);
  }

  /** Whether this payment (cumulative) will fully settle the fee */
  get willBeFullyPaid(): boolean {
    const newPayment = this.form.get('paymentAmount')!.value ?? 0;
    return this.alreadyPaid + newPayment >= (this.loan?.fee_value ?? 0);
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fee'] && this.fee) {
      this.patchForm();
    }
  }

  readonly amountFormatter = (value: number | null): string =>
    value !== null && value !== undefined ? `L ${value.toFixed(2)}` : '';

  readonly amountParser = (value: string): number =>
    parseFloat(value.replace(/L\s?/g, '').replace(/,/g, '')) || 0;

  private patchForm(): void {
    // Pre-fill payment amount with the remaining balance so a fully settled
    // fee only requires a single click from the user
    const remaining = this.remainingAmount;

    this.form.patchValue({
      paymentDate: this.formatDateForInput(new Date()),
      expirationDate: this.fee?.expiration_date
        ? this.formatDateForInput(new Date(this.fee.expiration_date))
        : '',
      paymentAmount: remaining > 0 ? remaining : 0,
    });

    // Update the dynamic max validator based on the remaining balance
    this.updateAmountValidators();
  }

  private updateAmountValidators(): void {
    const amountControl = this.form.get('paymentAmount')!;
    amountControl.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(this.remainingAmount),
    ]);
    amountControl.updateValueAndValidity();
  }

  // ─── Date helpers ────────────────────────────────────────────────────────────

  formatDateForDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // ─── Toggle custom date ──────────────────────────────────────────────────────

  onToggleCustomDate(checked: boolean): void {
    this.useCustomDate.set(checked);
    if (checked) {
      this.form.get('paymentDate')!.enable();
    } else {
      this.form.get('paymentDate')!.disable();
      this.form.get('paymentDate')!.setValue(this.formatDateForInput(new Date()));
    }
  }

  // ─── Drawer controls ─────────────────────────────────────────────────────────

  openDrawer(): void {
    if (!this.fee) return;
    this.patchForm();
    this.useCustomDate.set(false);
    this.form.get('paymentDate')!.disable();
    this.isVisible = true;
  }

  closeDrawer(): void {
    this.isVisible = false;
    this.isSubmitting.set(false);
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  submit(): void {
    if (!this.fee || !this.loan || this.isSubmitting()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const newPayment = this.form.get('paymentAmount')!.value as number;
    const cumulativePaid = this.alreadyPaid + newPayment;

    // Resolve state: only mark as Paid when the cumulative amount covers the full fee
    const resolvedState: FeeState = cumulativePaid >= this.loan.fee_value ? '3' : '1';
    const isFullyPaid = resolvedState === '3';

    // Resolve payment date — only relevant when fully settling
    const rawDate = this.form.getRawValue().paymentDate as string;
    const paymentDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

    this.isSubmitting.set(true);

    this.feesService.updateFee(this.fee.id, {
      fee_state: resolvedState,
      // Only stamp a payment date when the fee is fully settled
      payment_date: isFullyPaid ? paymentDate : null,
      paid_amount: cumulativePaid,
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDrawer();
        this.feeUpdated.emit();
      },
      error: (err) => {
        console.error('Error updating fee:', err);
        this.isSubmitting.set(false);
      }
    });
  }
}