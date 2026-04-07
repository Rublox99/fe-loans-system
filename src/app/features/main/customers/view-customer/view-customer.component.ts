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
  ]
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
