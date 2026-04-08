import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { CustomerFormComponent } from '../entities-forms/customer-form.component';
import { GuaranteeFormComponent } from '../entities-forms/guarantee-form.component';

@Component({
  selector: 'app-edit-entity',
  standalone: true,
  templateUrl: './edit-entity.component.html',
  imports: [
    CommonModule,
    WebIconComponent,
    CustomerFormComponent,
    GuaranteeFormComponent,
    FormsModule,
    NgZorroModule
  ]
})
export class EditEntityDrawerComponent implements OnInit {
  @Input() customerId!: string;
  @Input() entityType!: 'C' | 'G';

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

  handleCustomer(data: any) {
    // TODO: integrar con Supabase
  }

  handleGuarantee(data: any) {
    // TODO: integrar con Supabase
  }
}
