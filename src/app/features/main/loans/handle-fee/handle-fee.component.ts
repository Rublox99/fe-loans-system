import { CommonModule } from '@angular/common';
import {
  Component, EventEmitter, Input, OnChanges,
  Output, signal, SimpleChanges
} from '@angular/core';
import {
  FormControl, FormGroup, FormsModule,
  ReactiveFormsModule, Validators
} from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';           // ← ADD
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
  imports: [CommonModule, WebIconComponent, FormsModule, NgZorroModule, ReactiveFormsModule],
  styles: `
    .section__wrapper { @apply space-y-5 }
    .section__header {
      position: relative; padding-left: 10px;
      @apply font-roboto text-sm font-medium uppercase text-primary
    }
    .section__header::before {
      content: ''; position: absolute; top: 50%; left: 0;
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
  isPayingEarly = signal(false);
  useCustomDate = signal(false);

  form: FormGroup = new FormGroup({
    paymentDate: new FormControl<string>({ value: '', disabled: true }),
    expirationDate: new FormControl<string>({ value: '', disabled: true }),
    paymentAmount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ]),
  });

  constructor(
    private feesService: FeesService,
    private message: NzMessageService,
    private modal: NzModalService    // ← ADD
  ) { }

  // ─── Computed helpers ────────────────────────────────────────────────────────

  get alreadyPaid(): number {
    return this.fee?.paid_amount ?? 0;
  }

  /**
   * When isFutureFee, the max payable amount through normal payment
   * is capped to the remaining capital portion (no interest).
   * Beyond the cutoff, full fee_value applies.
   */
  get remainingAmount(): number {
    const base = this.isFutureFee
      ? this.earlyPaymentAmount          // ← cap to capital only
      : (this.loan?.fee_value ?? 0);
    return Math.max(0, base - this.alreadyPaid);
  }

  get willBeFullyPaid(): boolean {
    const newPayment = this.form.get('paymentAmount')!.value ?? 0;
    const base = this.isFutureFee
      ? this.earlyPaymentAmount
      : (this.loan?.fee_value ?? 0);
    return this.alreadyPaid + newPayment >= base;
  }

  /**
   * True when the fee's expiration date is beyond
   * first_expiration_date + 30 calendar days.
   */
  get isFutureFee(): boolean {
    if (!this.fee || !this.loan?.first_expiration_date) return false;
    const cutoff = new Date(this.loan.first_expiration_date);
    cutoff.setDate(cutoff.getDate() + 30);
    return new Date(this.fee.expiration_date) > cutoff;
  }

  /** Fee capital without interest (what fn_pay_fee_early charges) */
  get earlyPaymentAmount(): number {
    if (!this.loan) return 0;
    return +(this.loan.raw_capital / this.loan.fees).toFixed(2);
  }

  /** Interest saved by the client for paying early */
  get interestSaved(): number {
    if (!this.loan) return 0;
    return +((this.loan.fee_value) - this.earlyPaymentAmount).toFixed(2);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fee'] && this.fee) this.patchForm();
  }

  readonly amountFormatter = (v: number | null) =>
    v != null ? `L ${v.toFixed(2)}` : '';

  readonly amountParser = (v: string) =>
    parseFloat(v.replace(/L\s?/g, '').replace(/,/g, '')) || 0;

  private patchForm(): void {
    const remaining = this.remainingAmount;
    this.form.patchValue({
      paymentDate: this.formatDateForInput(new Date()),
      expirationDate: this.fee?.expiration_date
        ? this.formatDateForInput(new Date(this.fee.expiration_date))
        : '',
      paymentAmount: remaining > 0 ? remaining : 0,
    });
    this.updateAmountValidators();
  }

  private updateAmountValidators(): void {
    const ctrl = this.form.get('paymentAmount')!;
    ctrl.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(this.remainingAmount)  // ← already capped via remainingAmount
    ]);
    ctrl.updateValueAndValidity();
  }

  // ─── Date helpers ────────────────────────────────────────────────────────────

  formatDateForDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-HN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // ─── Toggle custom date ──────────────────────────────────────────────────────

  onToggleCustomDate(checked: boolean): void {
    this.useCustomDate.set(checked);
    const ctrl = this.form.get('paymentDate')!;
    if (checked) {
      ctrl.enable();
    } else {
      ctrl.disable();
      ctrl.setValue(this.formatDateForInput(new Date()));
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
    this.isPayingEarly.set(false);
  }

  // ─── Submit with optional warning modal ──────────────────────────────────────

  submit(): void {
    if (!this.fee || !this.loan || this.isSubmitting()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const newPayment = this.form.get('paymentAmount')!.value as number;

    if (this.isFutureFee && this.willBeFullyPaid) {
      this.payEarly();
      return;
    }

    /**
     * Show warning modal only when:
     * - Fee is beyond the 30-day cutoff (isFutureFee)
     * - AND payment entered exceeds earlyPaymentAmount
     * Since remainingAmount is capped to earlyPaymentAmount for future fees,
     * this case should not normally occur — but acts as a safety guard.
     */
    if (this.isFutureFee && newPayment > this.earlyPaymentAmount) {
      this.openInterestWarningModal();
      return;
    }

    this.executeSubmit(newPayment);
  }

  private openInterestWarningModal(): void {
    const newPayment = this.form.get('paymentAmount')!.value as number;

    const modalRef = this.modal.create({
      nzTitle: 'Pago con interés detectado',
      nzContent: `
        <div class="space-y-4 font-sans text-sm">

          <p class="text-standardGray">
            Está a punto de registrar un pago que incluye interés sobre una
            cuota futura. Considere la siguiente comparación:
          </p>

          <div class="flex gap-3 mt-2">

            <div class="flex-1 rounded-md border border-danger/30 bg-danger/5 p-3 space-y-1">
              <p class="text-xs uppercase text-standardGray">Pago actual (con interés)</p>
              <p class="text-lg font-bold text-danger">
                L ${newPayment.toFixed(2)}
              </p>
              <p class="text-xs text-standardGray">
                Incluye L ${this.interestSaved.toFixed(2)} de interés
              </p>
            </div>

            <div class="flex-1 rounded-md border border-success/30 bg-success/5 p-3 space-y-1">
              <p class="text-xs uppercase text-standardGray">Pago anticipado (sin interés)</p>
              <p class="text-lg font-bold text-success">
                L ${this.earlyPaymentAmount.toFixed(2)}
              </p>
              <p class="text-xs text-standardGray">
                Ahorro de L ${this.interestSaved.toFixed(2)}
              </p>
            </div>

          </div>

          <p class="text-xs text-standardGray mt-2">
            ¿Desea continuar con el pago incluyendo interés, o prefiere
            liquidar anticipadamente sin interés?
          </p>

        </div>
      `,
      nzOkText: 'Continuar con interés',
      nzOkDanger: true,
      nzCancelText: 'Cancelar',
      nzOnOk: () => this.executeSubmit(newPayment),
      nzOnCancel: () => { }
    });
  }

  private executeSubmit(newPayment: number): void {
    const cumulativePaid = this.alreadyPaid + newPayment;
    const base = this.isFutureFee
      ? this.earlyPaymentAmount
      : (this.loan!.fee_value);
    const resolvedState: FeeState = cumulativePaid >= base ? '3' : '1';
    const isFullyPaid = resolvedState === '3';
    const rawDate = this.form.getRawValue().paymentDate as string;
    const paymentDate = rawDate
      ? new Date(rawDate).toISOString()
      : new Date().toISOString();

    this.isSubmitting.set(true);

    this.feesService.updateFee(this.fee!.id, {
      fee_state: resolvedState,
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

  payEarly(): void {
    if (!this.fee || !this.loan || this.isPayingEarly()) return;

    this.isPayingEarly.set(true);

    const paymentDate = new Date().toISOString();

    this.feesService.payFeeEarly(this.fee.id, paymentDate).subscribe({
      next: () => {
        this.isPayingEarly.set(false);
        this.message.success('Cuota liquidada anticipadamente.');
        this.closeDrawer();
        this.feeUpdated.emit();
      },
      error: (err) => {
        console.error('Error en pago anticipado:', err);
        this.message.error('Error al liquidar la cuota anticipadamente.');
        this.isPayingEarly.set(false);
      }
    });
  }
}