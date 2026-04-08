import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';

@Component({
  selector: 'app-view-customer',
  standalone: true,
  templateUrl: './view-customer.component.html',
  imports: [
    CommonModule,
    WebIconComponent,
    FormsModule,
    NgZorroModule
  ],
  styles: `
    .section__wrapper {
      @apply space-y-2.5
    }

    .section__header {
      @apply font-sans text-xs font-bold uppercase text-highContrast
    }

    .section__line {
      @apply font-sans flex gap-2.5 text-base
    }

    .section__line-left {
      @apply flex-1
    }

    .section__line-right {
      @apply flex-none
    }
  `
})
export class ViewCustomerDrawerComponent implements OnInit {
  @Input() customerId!: string;

  isVisible: boolean = false

  constructor(
  ) { }

  ngOnInit() {
  }

  openDrawer() {
    this.isVisible = true
  }

  closeDrawer() {
    this.isVisible = false
  }
}
