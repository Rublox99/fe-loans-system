import {
  Component, EventEmitter, Input,
  OnInit, OnDestroy, Output, signal
} from '@angular/core';
import {
  AbstractControl, FormControl, FormGroup,
  ReactiveFormsModule, ValidationErrors, Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NzUploadChangeParam, NzUploadFile } from 'ng-zorro-antd/upload';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { PaymentGrade } from '../../../../core/types/payment-grade.type';
import { ProfessionOption } from '../../../../core/interfaces/profession-option.interface';
import { PROFESSION_LIST } from '../../../../shared/constants';
import { dniValidator, incomeValidator, phoneValidator } from '../add-entity/add-entity.component';

export interface GuaranteeFormOutput {
  formValue: {
    firstName: string;
    secondName: string;
    lastName: string;
    dni: string;   // formatted: xxxx-xxxx-xxxxx
    phone: string;   // formatted: xxxx-xxxx
    email: string;
    paymentGrade: PaymentGrade;
    location: string;
    profession: string;   // value from list OR custom text
    company: string;
    income: number;
    notes: string;
  };
  rawFiles: File[];
}

const GRADE_MAP: Record<string, PaymentGrade> = {
  A: '1', B: '2', C: '3', D: '4', E: '5',
};

@Component({
  selector: 'app-guarantee-form',
  standalone: true,
  templateUrl: './guarantee-form.component.html',
  imports: [WebIconComponent, CommonModule, ReactiveFormsModule, NgZorroModule],
  styles: `
    .section__wrapper { @apply space-y-5 }
    .section__header  { @apply font-sans text-xs font-bold uppercase text-highContrast }
    .section__line    { @apply font-sans flex gap-2.5 }
    .text-help        { @apply uppercase text-xs text-standardGray font-medium }
    .field__error     { @apply text-xs text-red-500 mt-1 }
  `
})
export class GuaranteeFormComponent implements OnInit, OnDestroy {
  @Input() entityId?: string;
  @Input() isLoading: boolean = false;

  @Output() submitForm = new EventEmitter<GuaranteeFormOutput>();
  @Output() closeDrawer = new EventEmitter<void>();

  readonly professions: ProfessionOption[] = PROFESSION_LIST;
  readonly isCustomProfession = signal<boolean>(false);

  private destroy$ = new Subject<void>();

  form: FormGroup = new FormGroup({
    firstName: new FormControl('', [Validators.required, Validators.maxLength(25)]),
    secondName: new FormControl('', [Validators.maxLength(25)]),
    lastName: new FormControl('', [Validators.required, Validators.maxLength(25)]),
    dni: new FormControl('', [Validators.required, dniValidator]),
    phone: new FormControl('', [Validators.required, phoneValidator]),
    email: new FormControl('', [Validators.required, Validators.email]),
    radioEntityGrade: new FormControl<string>('A', Validators.required),
    location: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    professionSelect: new FormControl<string | null>(null, Validators.required),
    professionCustom: new FormControl(''),
    company: new FormControl(''),
    income: new FormControl<number | null>(null, [Validators.required, incomeValidator]),
    notes: new FormControl('', [Validators.maxLength(500)])
  });

  mediaFiles = signal<NzUploadFile[]>([]);
  private rawFiles: File[] = [];

  ngOnInit(): void {
    // Show/hide custom profession input reactively
    this.form.get('professionSelect')!
      .valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        const isOther = val === 'otro';
        this.isCustomProfession.set(isOther);

        const customCtrl = this.form.get('professionCustom')!;
        if (isOther) {
          customCtrl.setValidators([Validators.required, Validators.maxLength(25)]);
        } else {
          customCtrl.clearValidators();
          customCtrl.setValue('');
        }
        customCtrl.updateValueAndValidity();
      });

    if (this.entityId) {
      // TODO: load from Supabase
      this.form.patchValue({
        firstName: 'John',
        secondName: 'Doe',
        lastName: 'Smith',
        dni: '0801-1990-12345',
        phone: '9999-8888',
        email: 'prueba@gmail.com',
        radioEntityGrade: 'A',
        location: 'Tegucigalpa, Francisco Morazán',
        professionSelect: 'ingeniero',
        company: 'Tech Co.',
        income: 5000,
        notes: 'This is a note about the guarantee.'
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * DNI: formats to xxxx-xxxx-xxxxx as user types
   * Only allows numeric input, strips everything else
   */
  onDniInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Strip non-digits
    const digits = input.value.replace(/\D/g, '').slice(0, 13);

    let formatted = digits;
    if (digits.length > 8) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    // Patch without re-triggering this listener
    this.form.get('dni')!.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  onDniKeydown(event: KeyboardEvent): void {
    this.preventNonNumeric(event);
  }

  /**
   * Phone: formats to xxxx-xxxx as user types
   */
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);

    const formatted = digits.length > 4
      ? `${digits.slice(0, 4)}-${digits.slice(4)}`
      : digits;

    this.form.get('phone')!.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  onPhoneKeydown(event: KeyboardEvent): void {
    this.preventNonNumeric(event);
  }

  /** Allows only digits, backspace, delete, arrows and tab */
  private preventNonNumeric(event: KeyboardEvent): void {
    const allowed = [
      'Backspace', 'Delete', 'Tab',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];
    if (allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  /** Returns true if a control is invalid AND has been touched */
  isInvalid(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }

  /** Touches all controls to trigger validation display on submit attempt */
  private markAllTouched(): void {
    Object.values(this.form.controls).forEach(ctrl => ctrl.markAsTouched());
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = (file.originFileObj ?? file) as unknown as File;
    this.rawFiles.push(rawFile);

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
    const remainingUids = new Set(info.fileList.map(f => f.uid));
    this.rawFiles = this.rawFiles.filter((_, i) => {
      const uid = this.mediaFiles()[i]?.uid;
      return uid ? remainingUids.has(uid) : false;
    });
    this.mediaFiles.set(info.fileList);
  }

  /* Called by the parent after a successful submission */
  resetForm(): void {
    this.form.reset({
      firstName: '',
      secondName: '',
      lastName: '',
      dni: '',
      phone: '',
      email: '',
      radioEntityGrade: 'A',
      location: '',
      professionSelect: null,
      professionCustom: '',
      company: '',
      income: null,
      notes: ''
    });

    // Reset upload state
    this.mediaFiles.set([]);
    this.rawFiles = [];

    // Reset profession custom input visibility
    this.isCustomProfession.set(false);

    // Clear touched/dirty state so no error messages show
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  closeDrawerFn(): void {
    this.closeDrawer.emit();
  }

  submit(): void {
    this.markAllTouched();
    if (this.form.invalid) return;

    const raw = this.form.value;

    // Resolve profession: use custom text if 'otro' was selected
    const profession = raw.professionSelect === 'otro'
      ? raw.professionCustom
      : raw.professionSelect;

    this.submitForm.emit({
      formValue: {
        firstName: raw.firstName,
        secondName: raw.secondName ?? '',
        lastName: raw.lastName,
        dni: raw.dni,
        phone: raw.phone,
        email: raw.email,
        paymentGrade: GRADE_MAP[raw.radioEntityGrade] ?? '1',
        location: raw.location ?? '',
        profession,
        company: raw.company ?? '',
        income: Number(raw.income),
        notes: raw.notes ?? '',
      },
      rawFiles: [...this.rawFiles],
    });
  }
}