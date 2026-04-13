import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgZorroModule } from '../../../../../shared/modules/ng-zorro.module';
import { WebIconComponent } from '../../../../../shared/components/web-icon.component';
import { LoansService } from '../../../../../core/services/pages/loans.service';
import { Customer } from '../../../../../core/interfaces/customers.interface';
import { GeneralService } from '../../../../../core/services/general.service';
import { interestRangeValidator, positiveNumberValidator } from '../../loans.component';
import { EntitiesService } from '../../../../../core/services/pages/entities.service';
import { Entity } from '../../../../../core/types/entity.type';

@Component({
  selector: 'app-loan-form',
  templateUrl: './loan-form.component.html',
  imports: [
    CommonModule,
    NgZorroModule,
    ReactiveFormsModule,
    WebIconComponent
  ],
  styles: `
        .section__wrapper { @apply space-y-5 }
        .section__header  { @apply font-sans text-xs font-bold uppercase text-highContrast }
        .section__line    { @apply font-sans flex gap-2.5 }
        .text-help        { @apply uppercase text-xs text-standardGray font-medium }
        .field__error     { @apply text-xs text-red-500 mt-1 }
    `
})
export class LoanFormComponent implements OnInit {
  @Output() submitForm = new EventEmitter<void>();
  @Output() closeDrawer = new EventEmitter<void>();

  private destroyRef = inject(DestroyRef);

  form: FormGroup = new FormGroup({
    customerId: new FormControl<string | null>(null, Validators.required),
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

  fees = signal(0);
  capital = signal(0);
  interest = signal(0);

  interestAmount = computed(() => this.capital() * (this.interest() / 100));
  total = computed(() => this.capital() + this.interestAmount());
  feeValue = computed(() => this.fees() > 0 ? this.total() / this.fees() : 0);

  entitySearchResults = signal<Entity[]>([]);
  isEntitySearchLoading = signal(false);
  private onEntitySearchDebounced!: (term: string) => void;

  isSubmitting = signal(false);

  constructor(
    private entitiesService: EntitiesService,
    private loansService: LoansService,
    private generalService: GeneralService
  ) { }

  ngOnInit(): void {
    // Summary signals
    this.form.get('lendingCapital')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.capital.set(Number(v) || 0));

    this.form.get('feesAmount')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.fees.set(Number(v) || 0));

    this.form.get('interest')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.interest.set(Number(v) || 0));

    // Debounced entity search
    this.onEntitySearchDebounced = this.generalService.debounce((term: string) => {
      if (!term?.trim()) {
        this.entitySearchResults.set([]);
        this.isEntitySearchLoading.set(false);
        return;
      }
      this.isEntitySearchLoading.set(true);
      this.entitiesService.getEntities(term, 1, 10)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ data }) => {
            this.entitySearchResults.set(data);
            this.isEntitySearchLoading.set(false);
          },
          error: () => this.isEntitySearchLoading.set(false)
        });
    }, 350);
  }

  onEntitySearch(term: string): void {
    this.isEntitySearchLoading.set(true); // optimistic — debounce will resolve
    this.onEntitySearchDebounced(term);
  }

  getEntityFullName(entity: Entity): string {
    return [entity.first_name, entity.second_name, entity.last_names]
      .filter(Boolean)
      .join(' ');
  }

  // ── Validation helpers (used in template) ────────────────────────────
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

  closeDrawerFn(): void {
    this.closeDrawer.emit();
  }

  submit(): void {
    // Touch all fields to trigger validation display
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    this.loansService.createLoan({
      customerId: this.form.value.customerId,
      capital: Number(this.form.value.lendingCapital),
      interest: Number(this.form.value.interest),
      fees: Number(this.form.value.feesAmount),
      feeValue: this.feeValue(),
      modality: this.form.value.modality,
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.form.reset({ modality: 'S' });   // keep modality default
        this.fees.set(0);
        this.capital.set(0);
        this.interest.set(0);
        this.submitForm.emit();                // → parent closes drawer + refreshes
      },
      error: (err) => {
        console.error('Error creating loan:', err);
        this.isSubmitting.set(false);          // allow retry
      }
    });
  }
}