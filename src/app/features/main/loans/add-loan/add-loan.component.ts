import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { LoanFormComponent } from './loan-form/loan-form.component';

@Component({
  selector: 'app-add-loan',
  standalone: true,
  templateUrl: './add-loan.component.html',
  imports: [
    CommonModule,
    WebIconComponent,
    LoanFormComponent,
    FormsModule,
    NgZorroModule
  ],
  styles: `
    .section__wrapper {
      @apply space-y-5
    }

    .section__header {
      @apply font-sans text-xs font-bold uppercase text-highContrast
    }

    .section__line {
      @apply font-sans flex gap-2.5
    }

    .text-help {
      @apply uppercase text-xs text-standardGray font-medium
    }
  `
})
export class AddLoanDrawerComponent implements OnInit {
  @Output() loanCreated = new EventEmitter<void>();

  isVisible: boolean = false

  constructor(
  ) { }

  ngOnInit() {
  }

  onFormSubmitted(): void {
    this.closeDrawer();
    this.loanCreated.emit();
  }

  openDrawer() {
    this.isVisible = true
  }

  closeDrawer() {
    this.isVisible = false
  }
}
