import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgZorroModule } from '../../../../../shared/modules/ng-zorro.module';
import { WebIconComponent } from '../../../../../shared/components/web-icon.component';
import { NzUploadChangeParam, NzUploadFile } from 'ng-zorro-antd/upload';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  templateUrl: './customer-form.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgZorroModule, WebIconComponent],
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
export class CustomerFormComponent {
  @Output() submitForm = new EventEmitter<any>();
  @Output() closeDrawer = new EventEmitter<any>();

  form: FormGroup = new FormGroup({
    firstName: new FormControl('', Validators.required),
    secondName: new FormControl(''),
    lastName: new FormControl('', Validators.required),
    dni: new FormControl('', Validators.required),
    phone: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    guarantee: new FormControl(''),
    isWithSpouse: new FormControl(false),
    radioEntityGrade: new FormControl(''),
    location: new FormControl(''),
    profession: new FormControl(''),
    company: new FormControl(''),
    income: new FormControl(0),

    spouse: new FormGroup({
      firstName: new FormControl(''),
      lastName: new FormControl(''),
      dni: new FormControl(''),
      phone: new FormControl(''),
      profession: new FormControl(''),
      income: new FormControl(0),
      location: new FormControl('')
    }),
    notes: new FormControl('')
  });

  constructor() {
    this.form.get('isWithSpouse')?.valueChanges.subscribe(value => {
      const spouseGroup = this.form.get('spouse');
      if (value) {
        spouseGroup?.get('firstName')?.setValidators(Validators.required);
        spouseGroup?.get('lastName')?.setValidators(Validators.required);
        spouseGroup?.get('dni')?.setValidators(Validators.required);
        spouseGroup?.get('phone')?.setValidators(Validators.required);
        spouseGroup?.get('profession')?.setValidators(Validators.required);
        spouseGroup?.get('income')?.setValidators(Validators.required);
        spouseGroup?.get('location')?.setValidators(Validators.required);
      } else {
        spouseGroup?.clearValidators();
        spouseGroup?.reset();
      }
      spouseGroup?.updateValueAndValidity();
    });
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

  submit() {
    if (this.form.invalid) return;
    this.submitForm.emit(this.form.value);
  }
}