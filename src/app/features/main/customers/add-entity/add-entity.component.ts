import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';

@Component({
  selector: 'app-add-entity',
  standalone: true,
  templateUrl: './add-entity.component.html',
  imports: [
    CommonModule,
    WebIconComponent,
    FormsModule,
    NgZorroModule
  ]
})
export class AddEntityDrawerComponent implements OnInit {
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
