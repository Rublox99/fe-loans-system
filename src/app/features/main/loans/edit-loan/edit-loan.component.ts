// edit-loan.component.ts
import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { Loan, UpdateLoanPayload } from '../../../../core/interfaces/loans.interface';
import { LoanState } from '../../../../core/types/loan-state.type';
import { NzModalService } from 'ng-zorro-antd/modal';
import { concatMap, of } from 'rxjs';
import { interestRangeValidator, positiveNumberValidator } from '../loans.component';
import { LoansService } from '../../../../core/services/pages/loans.service';

export interface LoanStateOption {
  value: LoanState;
  label: string;
}

@Component({
  selector: 'app-edit-loan',
  templateUrl: './edit-loan.component.html',
  imports: [
    CommonModule,
    NgZorroModule,
    ReactiveFormsModule,
    WebIconComponent
  ],
  styles: `
        .section__line    { @apply font-sans flex gap-2.5 }
        .text-help        { @apply uppercase text-xs text-standardGray font-medium }
        .field__error     { @apply text-xs text-red-500 mt-1 }
    `
})
export class EditLoanDrawerComponent implements OnChanges {
  @Input() loan!: Loan;
  @Output() loanUpdated = new EventEmitter<void>();

  @ViewChild('confirmModalContent') confirmModalContent!: TemplateRef<void>;

  private destroyRef = inject(DestroyRef);

  isVisible = false;
  isSubmitting = signal(false);

  // ── State options (same transition rules as before) ───────────────
  readonly stateOptions: LoanStateOption[] = [
    { value: 'Under Review', label: 'En revisión' },
    { value: 'Accepted', label: 'Aceptado' },
    { value: 'Denied', label: 'Rechazado' },
  ];

  form = new FormGroup({
    capital: new FormControl<number | null>(null, [
      Validators.required,
      positiveNumberValidator
    ]),
    interest: new FormControl<number | null>(null, [
      Validators.required,
      interestRangeValidator
    ]),
    fees: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(999),
      positiveNumberValidator
    ]),
    modality: new FormControl<'S' | 'Q' | 'M'>('S', Validators.required),
    state: new FormControl<LoanState>('Under Review', Validators.required),
  });

  // ── Modality frequency map ────────────────────────────────────────────
  private readonly frequencyMap: Record<'S' | 'Q' | 'M', number> = {
    'S': 4,
    'Q': 2,
    'M': 1
  };

  modality = signal<'S' | 'Q' | 'M'>('S');

  // ── Summary signals ───────────────────────────────────────────────────
  capital = signal(0);
  interest = signal(0);
  fees = signal(0);

  frequency = computed(() => this.frequencyMap[this.modality()] ?? 1);

  interestAmount = computed(() =>
    this.capital() * (this.interest() / 100)
  );

  interestPerFee = computed(() =>
    this.interestAmount() / this.frequency()
  );

  capitalPerFee = computed(() =>
    this.fees() > 0 ? this.capital() / this.fees() : 0
  );

  feeValue = computed(() =>
    this.capitalPerFee() + this.interestPerFee()
  );

  total = computed(() =>
    this.feeValue() * this.fees()
  );

  constructor(
    private loansService: LoansService,
    private modal: NzModalService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loan'] && this.loan) {
      this.patchForm();
    }
  }

  private patchForm(): void {
    this.form.patchValue({
      capital: this.loan.raw_capital,
      interest: this.loan.interest,
      fees: this.loan.fees,
      modality: this.loan.modality as 'S' | 'Q' | 'M',
      state: this.loan.state as LoanState,
    });

    this.capital.set(this.loan.raw_capital);
    this.interest.set(this.loan.interest);
    this.fees.set(this.loan.fees);
    this.modality.set(this.loan.modality as 'S' | 'Q' | 'M');

    this.form.get('capital')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.capital.set(Number(v) || 0));

    this.form.get('interest')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.interest.set(Number(v) || 0));

    this.form.get('fees')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.fees.set(Number(v) || 0));

    this.form.get('modality')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.modality.set((v as 'S' | 'Q' | 'M') ?? 'S')); // 👈 new
  }

  openDrawer(): void {
    this.patchForm();
    this.isVisible = true;
  }

  closeDrawer(): void {
    this.isVisible = false;
    this.isSubmitting.set(false);
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

  getStateLabelClass(state: LoanState): string {
    switch (state) {
      case 'Under Review': return 'text-orange-700 bg-orange-100 px-2 py-1 rounded-md';
      case 'Accepted': return 'text-green-700 bg-green-100 px-2 py-1 rounded-md';
      case 'Denied': return 'text-red-700 bg-red-100 px-2 py-1 rounded-md';
      default: return 'text-gray-600 bg-gray-100 px-2 py-1 rounded-md';
    }
  }

  private buildFieldPayload(): UpdateLoanPayload | null {
    const v = this.form.value;
    const payload: UpdateLoanPayload = {};
    let hasChanges = false;

    if (Number(v.capital) !== this.loan.raw_capital) {  // 👈 compare against raw_capital
      payload.raw_capital = Number(v.capital);
      payload.capital = this.total();
      payload.capital_balance = this.total();
      hasChanges = true;
    }
    if (Number(v.interest) !== this.loan.interest) {
      payload.interest = Number(v.interest);
      hasChanges = true;
    }
    if (Number(v.fees) !== this.loan.fees) {
      payload.fees = Number(v.fees);
      hasChanges = true;
    }
    if (v.modality !== this.loan.modality) {
      payload.modality = v.modality as 'S' | 'Q' | 'M';
      hasChanges = true;
    }

    // Recalculate fee_value whenever any relevant field changed
    if (hasChanges) {
      payload.fee_value = this.feeValue();
    }

    return hasChanges ? payload : null;
  }

  getStateBadgeClass(state: LoanState | null | undefined): string {
    switch (state) {
      case 'Under Review': return 'border-orange-400 text-orange-700 bg-orange-100';
      case 'Accepted': return 'border-green-500 text-green-700 bg-green-100';
      case 'Denied': return 'border-red-500 text-red-700 bg-red-100';
      default: return 'border-gray-300 text-gray-600 bg-gray-100';
    }
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSubmitting()) return;

    const newState = this.form.value.state as LoanState;
    const stateChanged = newState !== this.loan.state;
    const fieldPayload = this.buildFieldPayload();

    if (!fieldPayload && !stateChanged) {
      this.closeDrawer();
      return;
    }

    if (stateChanged) {
      this.modal.confirm({
        nzTitle: 'Confirmar cambio de estado',
        nzContent: this.confirmModalContent,
        nzOkText: 'Confirmar',
        nzCancelText: 'Cancelar',
        nzOnOk: () => this.executeUpdate(fieldPayload, newState),
      });
      return;
    }

    this.executeUpdate(fieldPayload, null);
  }

  private executeUpdate(fieldPayload: UpdateLoanPayload | null, newState: LoanState | null): void {
    this.isSubmitting.set(true);

    // Step 1: update fields (if any), Step 2: update state (if changed)
    const fieldsUpdate$ = fieldPayload
      ? this.loansService.updateLoan(this.loan.id, fieldPayload)
      : of(undefined);

    fieldsUpdate$.pipe(
      concatMap(() => {
        if (newState) {
          return this.loansService.updateLoanState(this.loan.id, newState);
        }
        return of(undefined);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDrawer();
        this.loanUpdated.emit();
      },
      error: (err) => {
        console.error('Error updating loan:', err);
        this.isSubmitting.set(false);
      }
    });
  }
}