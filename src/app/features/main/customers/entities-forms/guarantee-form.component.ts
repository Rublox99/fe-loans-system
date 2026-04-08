import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzUploadChangeParam, NzUploadFile } from 'ng-zorro-antd/upload';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';

@Component({
  selector: 'app-guarantee-form',
  standalone: true,
  templateUrl: './guarantee-form.component.html',
  imports: [WebIconComponent, CommonModule, ReactiveFormsModule, NgZorroModule],
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
export class GuaranteeFormComponent implements OnInit {
  @Input() entityId?: string;

  @Output() submitForm = new EventEmitter<any>();
  @Output() closeDrawer = new EventEmitter<any>();

  form: FormGroup = new FormGroup({
    firstName: new FormControl('', Validators.required),
    secondName: new FormControl(''),
    lastName: new FormControl('', Validators.required),
    dni: new FormControl('', Validators.required),
    phone: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    radioEntityGrade: new FormControl(''),
    location: new FormControl(''),
    profession: new FormControl(''),
    company: new FormControl(''),
    income: new FormControl(0),
    notes: new FormControl('')
  });

  constructor() { }

  ngOnInit(): void {
    /* Loads data if this is an existing entity */
    if (this.entityId) {
      /* TODO: Load data from Supabase */
      this.form.patchValue({
        firstName: 'John',
        secondName: 'Doe',
        lastName: 'Smith',
        dni: '12345678',
        phone: '555-1234',
        email: 'prueba@gmail.com',
        radioEntityGrade: 'A',
        location: 'Lima',
        profession: 'Engineer',
        company: 'Tech Co.',
        income: 5000,
        notes: 'This is a note about the guarantee.'
      });
    }
  }

  mediaFiles = signal<NzUploadFile[]>([]);

  beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = (file.originFileObj ?? file) as unknown as File;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      this.mediaFiles.update(list => [
        ...list,
        { uid: file.uid, name: file.name, status: 'done', url: dataUrl, thumbUrl: dataUrl }
      ]);
    };
    reader.readAsDataURL(rawFile);
    return false;
  };

  handleMediaChange(info: NzUploadChangeParam): void {
    this.mediaFiles.set(info.fileList);
  }

  closeDrawerFn() {
    this.closeDrawer.emit();
  }

  deactivate() {
    /* TODO: Implement deactivation logic */
    this.closeDrawer.emit();
  }

  submit() {
    if (this.form.invalid) return;
    this.submitForm.emit(this.form.value);
  }
}