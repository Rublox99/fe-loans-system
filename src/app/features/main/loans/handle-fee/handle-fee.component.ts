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
    paymentState: new FormControl<FeeState>('3', Validators.required), // default to Paid
    paymentDate: new FormControl<string>({ value: '', disabled: true }), // disabled until toggle
    expirationDate: new FormControl<string>({ value: '', disabled: true }),
  });

  constructor(private feesService: FeesService) { }

  // OnChanges instead of OnInit — fee arrives as @Input() after construction
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fee'] && this.fee) {
      this.patchDates();
    }
  }

  private patchDates(): void {
    this.form.patchValue({
      paymentDate: this.formatDateForInput(new Date()), // Always the current date by default
      expirationDate: this.fee?.expiration_date
        ? this.formatDateForInput(new Date(this.fee.expiration_date))
        : ''
    });
  }

  // dd/mm/yyyy → for display in disabled input
  formatDateForDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // yyyy-mm-dd → for the date input value attribute
  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onToggleCustomDate(checked: boolean): void {
    this.useCustomDate.set(checked);
    if (checked) {
      this.form.get('paymentDate')!.enable();
    } else {
      this.form.get('paymentDate')!.disable();
      this.form.get('paymentDate')!.setValue(this.formatDateForInput(new Date()));
    }
  }

  openDrawer(): void {
    if (!this.fee) return;
    this.patchDates();
    this.useCustomDate.set(false);
    this.form.get('paymentDate')!.disable();
    this.isVisible = true;
  }

  closeDrawer(): void {
    this.isVisible = false;
    this.isSubmitting.set(false);
  }

  submit(): void {
    if (!this.fee || this.isSubmitting()) return;

    const selectedState = this.form.get('paymentState')!.value as FeeState;

    // Resolve payment date — custom or today
    const rawDate = this.form.getRawValue().paymentDate as string;
    const paymentDate = rawDate ? new Date(rawDate).toISOString() : new Date().toISOString();

    this.isSubmitting.set(true);

    this.feesService.updateFee(this.fee.id, {
      fee_state: selectedState,
      payment_date: selectedState === '3' ? paymentDate : null,
      paid_amount: selectedState === '3' ? (this.loan?.fee_value ?? 0) : null
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