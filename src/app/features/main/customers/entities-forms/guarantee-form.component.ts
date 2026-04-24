import {
  Component, EventEmitter, Input,
  OnInit, OnDestroy, Output, signal
} from '@angular/core';
import {
  FormControl, FormGroup,
  ReactiveFormsModule, Validators
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
import { GuaranteePerson } from '../../../../core/interfaces/guarantee-person.interface';

export interface GuaranteeFormOutput {
  formValue: {
    firstName: string;
    secondName: string;
    lastName: string;
    dni: string;
    phone: string;
    email: string;
    paymentGrade: PaymentGrade;
    location: string;
    profession: string;
    company: string;
    income: number;
    notes: string;
  };
  rawFiles: File[];
}

const GRADE_MAP: Record<string, PaymentGrade> = {
  A: '1', B: '2', C: '3', D: '4', E: '5',
};

// Inverse map for loading existing grade into the radio group
const GRADE_LABEL_MAP: Record<string, string> = {
  '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E',
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
    email: new FormControl('', [Validators.required]),
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

  // ── Edit-mode gallery tracking ────────────────────────────────────────────

  /**
   * File names (not signed URLs) of images that existed when the drawer
   * opened and have NOT been removed by the user.
   */
  survivingImageFileNames: string[] = [];

  /**
   * File names of images the user removed from the list during this edit
   * session — these will be deleted from storage.
   */
  imagesToDelete: string[] = [];

  /**
   * Parallel array to mediaFiles: for pre-existing images this holds the
   * original storage filename; for newly added files it is null.
   */
  private mediaFileNames: (string | null)[] = [];

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Edit-mode loader (called by parent after fetch completes) ─────────────

  /**
   * Patches the form with existing data and populates the gallery preview
   * with signed URLs while tracking original filenames for diffing on save.
   *
   * @param data        The flat GuaranteePerson record from the DB
   * @param signedUrls  Pre-signed URLs for each filename in data.gallery
   * @param profList    The profession list used to detect 'otro' vs known value
   */
  loadForEdit(
    data: GuaranteePerson,
    signedUrls: Record<string, string>,
    profList: ProfessionOption[]
  ): void {
    // Resolve profession select vs custom
    const knownProfession = profList.find(p => p.value === data.profession);
    const professionSelect = knownProfession ? data.profession : 'otro';
    const professionCustom = knownProfession ? '' : data.profession;

    this.form.patchValue({
      firstName: data.first_name,
      secondName: data.second_name,
      lastName: data.last_names,
      dni: data.dni.trim(),
      phone: data.phone_number,
      email: data.email,
      radioEntityGrade: GRADE_LABEL_MAP[data.payment_grade ?? '1'] ?? 'A',
      location: data.location,
      professionSelect,
      professionCustom,
      company: data.company ?? '',
      income: data.income,
      notes: data.comment ?? '',
    });

    // Initialise gallery tracking
    this.survivingImageFileNames = [...data.gallery];
    this.imagesToDelete = [];
    this.mediaFileNames = [...data.gallery]; // one entry per image

    // Build NzUploadFile list from signed URLs
    const previewFiles: NzUploadFile[] = data.gallery.map((filename, i) => ({
      uid: `-existing-${i}`,
      name: filename,
      status: 'done',
      url: signedUrls[i] ?? '',
      thumbUrl: signedUrls[i] ?? '',
    }));

    this.mediaFiles.set(previewFiles);
    this.rawFiles = []; // no new raw files yet
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    const rawFile = (file.originFileObj ?? file) as unknown as File;
    this.rawFiles.push(rawFile);
    this.mediaFileNames.push(null); // new file — no existing filename

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
    const currentFiles = this.mediaFiles();

    currentFiles.forEach((f, i) => {
      if (!remainingUids.has(f.uid)) {
        const filename = this.mediaFileNames[i];

        if (filename) {
          // Pre-existing image was removed — mark for deletion
          this.imagesToDelete.push(filename);
          this.survivingImageFileNames = this.survivingImageFileNames
            .filter(n => n !== filename);
        } else {
          // Newly added file was removed before saving — drop from rawFiles
          // Find the raw file index by matching uid order among null-named entries
          const newFileIndex = currentFiles
            .slice(0, i)
            .filter((_, j) => this.mediaFileNames[j] === null)
            .length;
          this.rawFiles.splice(newFileIndex, 1);
        }
      }
    });

    // Rebuild parallel arrays to match the new fileList order
    const newMediaFileNames: (string | null)[] = [];
    info.fileList.forEach(f => {
      const idx = currentFiles.findIndex(c => c.uid === f.uid);
      newMediaFileNames.push(idx !== -1 ? this.mediaFileNames[idx] : null);
    });

    this.mediaFileNames = newMediaFileNames;
    this.mediaFiles.set(info.fileList);
  }

  isInvalid(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }

  private markAllTouched(): void {
    Object.values(this.form.controls).forEach(ctrl => ctrl.markAsTouched());
  }

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

    this.mediaFiles.set([]);
    this.rawFiles = [];
    this.survivingImageFileNames = [];
    this.imagesToDelete = [];
    this.mediaFileNames = [];
    this.isCustomProfession.set(false);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  onDniInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 13);

    let formatted = digits;
    if (digits.length > 8) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    this.form.get('dni')!.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  onDniKeydown(event: KeyboardEvent): void {
    this.preventNonNumeric(event);
  }

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

  private preventNonNumeric(event: KeyboardEvent): void {
    const allowed = [
      'Backspace', 'Delete', 'Tab',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];
    if (allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  closeDrawerFn(): void {
    this.closeDrawer.emit();
  }

  submit(): void {
    this.markAllTouched();
    if (this.form.invalid) return;

    const raw = this.form.value;
    this.isLoading = true;

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

    this.isLoading = false;
  }
}