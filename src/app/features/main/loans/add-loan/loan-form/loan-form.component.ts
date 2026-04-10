import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgZorroModule } from '../../../../../shared/modules/ng-zorro.module';
import { WebIconComponent } from '../../../../../shared/components/web-icon.component';

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
  `
})
export class LoanFormComponent implements OnInit {
  @Output() submitForm = new EventEmitter<any>();
  @Output() closeDrawer = new EventEmitter<any>();

  form: FormGroup = new FormGroup({
    customerId: new FormControl('', Validators.required),
    lendingCapital: new FormControl(0, [Validators.required, Validators.min(1)]),
    feesAmount: new FormControl(0, [Validators.required, Validators.min(1)]),
    interest: new FormControl(0, [Validators.required, Validators.min(1)]),
    modality: new FormControl('S', Validators.required),
  });

  fees = signal(0);
  capital = signal(0);
  interest = signal(0);

  interestAmount = computed(() =>
    this.capital() * (this.interest() / 100)
  );

  total = computed(() =>
    this.capital() + this.interestAmount()
  );

  feeValue = computed(() =>
    this.fees() > 0 ? this.total() / this.fees() : 0
  );

  constructor() { }

  ngOnInit(): void {
    this.form.get('lendingCapital')?.valueChanges.subscribe(value => {
      this.capital.set(Number(value) || 0);
    });

    this.form.get('feesAmount')?.valueChanges.subscribe(value => {
      this.fees.set(Number(value) || 0);
    });

    this.form.get('interest')?.valueChanges.subscribe(value => {
      this.interest.set(Number(value) || 0);
    });
  }

  closeDrawerFn(): void {
    this.closeDrawer.emit();
  }

  submit(): void {
    if (this.form.invalid) return;

    /* TODO: Connect to Supabase */
    this.form.reset();
    this.submitForm.emit(this.form.value);
  }
}