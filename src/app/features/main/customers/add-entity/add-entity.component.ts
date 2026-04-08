import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { CustomerFormComponent } from '../entities-forms/customer-form.component';
import { GuaranteeFormComponent } from '../entities-forms/guarantee-form.component';

@Component({
  selector: 'app-add-entity',
  standalone: true,
  templateUrl: './add-entity.component.html',
  imports: [
    CommonModule,
    WebIconComponent,
    CustomerFormComponent,
    GuaranteeFormComponent,
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
export class AddEntityDrawerComponent implements OnInit {
  isVisible: boolean = false

  radioEntityType: string = 'C'; // C: Customer, G: Guarantee

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

  handleCustomer(data: any) {
    // TODO: integrar con Supabase
  }

  handleGuarantee(data: any) {
    // TODO: integrar con Supabase
  }
}
