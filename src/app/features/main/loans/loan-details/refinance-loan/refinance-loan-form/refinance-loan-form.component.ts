// refinance-loan-form.component.ts
import {
  Component, computed, DestroyRef, EventEmitter,
  inject, Input, NgZone, OnInit, Output, signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NgZorroModule } from '../../../../../../shared/modules/ng-zorro.module';
import { WebIconComponent } from '../../../../../../shared/components/web-icon.component';
import { Loan } from '../../../../../../core/interfaces/loans.interface';
import { interestRangeValidator, positiveNumberValidator } from '../../../loans.component';
import { LoansService } from '../../../../../../core/services/pages/loans.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-refinance-loan-form',
  templateUrl: './refinance-loan-form.component.html',
  standalone: true,
  imports: [CommonModule, NgZorroModule, ReactiveFormsModule, WebIconComponent],
  styles: `
    .section__line { @apply font-sans flex gap-2.5 }
    .text-help     { @apply uppercase text-xs text-standardGray font-medium }
    .field__error  { @apply text-xs text-red-500 mt-1 }
  `
})
export class RefinanceLoanFormComponent implements OnInit {
  @Input({ required: true }) sourceLoan!: Loan;
  @Output() submitForm = new EventEmitter<void>();
  @Output() closeDrawer = new EventEmitter<void>();

  private destroyRef = inject(DestroyRef);

  form = new FormGroup({
    lendingCapital: new FormControl<number | null>(null, [
      Validators.required,
      positiveNumberValidator
    ]),
    feesAmount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(999),
      positiveNumberValidator
    ]),
    interest: new FormControl<number | null>(null, [
      Validators.required,
      interestRangeValidator
    ]),
    modality: new FormControl<'S' | 'Q' | 'M'>('S', Validators.required),
  });

  // ── Frequency map ─────────────────────────────────────────────────────────
  private readonly frequencyMap: Record<'S' | 'Q' | 'M', number> = {
    S: 4, Q: 2, M: 1
  };

  // ── Reactive summary signals ──────────────────────────────────────────────
  capital = signal(0);
  fees = signal(0);
  interest = signal(0);
  modality = signal<'S' | 'Q' | 'M'>('S');

  frequency = computed(() => this.frequencyMap[this.modality()] ?? 1);
  interestAmount = computed(() => this.capital() * (this.interest() / 100));
  interestPerFee = computed(() => this.interestAmount() / this.frequency());
  capitalPerFee = computed(() => this.fees() > 0 ? this.capital() / this.fees() : 0);
  feeValue = computed(() => this.capitalPerFee() + this.interestPerFee());
  totalCapital = computed(() => this.feeValue() * this.fees());

  // ── Refinancing-specific computed values ─────────────────────────────────
  /** A's pending balance that will be discounted from B */
  pendingBalanceA = computed(() => this.sourceLoan?.capital_balance ?? 0);

  /** B's effective starting balance after discounting A */
  effectiveBalance = computed(() =>
    Math.max(0, this.totalCapital() - this.pendingBalanceA())
  );

  /** True when A's pending balance would exceed B's total capital */
  balanceExceedsCapital = computed(() =>
    this.totalCapital() > 0 && this.pendingBalanceA() > this.totalCapital()
  );

  isSubmitting = signal(false);

  // ── 70% eligibility (informational, already checked by parent) ───────────
  get eligibilityPercent(): number {
    return Math.round((this.sourceLoan.paid_fees / this.sourceLoan.fees) * 100);
  }

  constructor(
    private loansService: LoansService,
    private message: NzMessageService,
    private router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.form.get('lendingCapital')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.capital.set(Number(v) || 0));

    this.form.get('feesAmount')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.fees.set(Number(v) || 0));

    this.form.get('interest')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.interest.set(Number(v) || 0));

    this.form.get('modality')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.modality.set((v as 'S' | 'Q' | 'M') ?? 'S'));
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getError(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl?.touched || !ctrl?.errors) return null;
    if (ctrl.errors['required']) return 'Este campo es requerido.';
    if (ctrl.errors['notPositive']) return 'Debe ser un número mayor a 0.';
    if (ctrl.errors['outOfRange']) return 'El interés debe estar entre 1% y 50%.';
    if (ctrl.errors['min']) return `Valor mínimo: ${ctrl.errors['min'].min}.`;
    if (ctrl.errors['max']) return `Valor máximo: ${ctrl.errors['max'].max}.`;
    return 'Valor inválido.';
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSubmitting()) return;

    if (this.balanceExceedsCapital()) {
      this.message.error(
        'El capital del nuevo préstamo debe ser mayor al saldo pendiente del préstamo actual.'
      );
      return;
    }

    this.isSubmitting.set(true);

    this.loansService.refinanceLoan({
      sourceLoanId: this.sourceLoan.id,
      newRawCapital: Number(this.form.value.lendingCapital),
      interest: Number(this.form.value.interest),
      fees: Number(this.form.value.feesAmount),
      modality: this.form.value.modality!,
    }).subscribe({
      next: ({ newLoanId }) => {
        this.isSubmitting.set(false);
        this.message.success('Préstamo refinanciado exitosamente.');
        this.submitForm.emit();

        // Run inside NgZone so the router actually commits the navigation
        /* TODO: Fix navigation on successful refinancing */
        /* 
        this.ngZone.run(() => {
          this.router.navigate(['/v1/main/loans', newLoanId, 'details']);
        });
        */
      },
      error: (err) => {
        console.error('Refinancing error:', err);
        this.message.error('Error al refinanciar el préstamo. Intente de nuevo.');
        this.isSubmitting.set(false);
      }
    });
  }
}