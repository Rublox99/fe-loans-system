import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { Fee } from '../../../../core/interfaces/fees.interface';
import { Loan } from '../../../../core/interfaces/loans.interface';

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
    .section__wrapper {
      @apply space-y-2.5
    }

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

    .section__line {
      @apply font-sans flex gap-2.5
    }
  `
})
export class HandleFeeDrawerComponent implements OnInit {
  @Input() fee: Fee | null = null;
  @Input() loan: Loan | null = null;

  isVisible: boolean = false

  form: FormGroup = new FormGroup({
    paymentState: new FormControl('1'),
    paymentDate: new FormControl(''),
    expirationDate: new FormControl({ value: '', disabled: true }),
  })

  constructor(
  ) { }

  ngOnInit() {
    this.form.patchValue({
      paymentDate: this.fee?.payment_date ? new Date(this.fee.payment_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      expirationDate: this.fee?.expiration_date ? new Date(this.fee.expiration_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })
  }

  openDrawer() {
    this.isVisible = true
  }

  closeDrawer() {
    this.isVisible = false
  }

  submit() {
    this.closeDrawer()
  }
}
