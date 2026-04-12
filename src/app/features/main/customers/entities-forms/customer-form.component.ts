import {
  Component, EventEmitter, Input,
  OnInit, OnDestroy, Output, signal
} from '@angular/core';
import {
  FormControl, FormGroup,
  FormsModule, ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { NzUploadChangeParam, NzUploadFile } from 'ng-zorro-antd/upload';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { PaymentGrade } from '../../../../core/types/payment-grade.type';
import { ProfessionOption } from '../../../../core/interfaces/profession-option.interface';
import { PROFESSION_LIST } from '../../../../shared/constants';
import { GuaranteePerson } from '../../../../core/interfaces/guarantee-person.interface';
import { EntitiesService } from '../../../../core/services/pages/entities.service';
import { dniValidator, incomeValidator, phoneValidator } from '../add-entity/add-entity.component';
import { CustomerForEdit } from '../../../../core/interfaces/customers.interface';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

export interface ExistingGalleryImage {
  fileName: string;   // stored in DB
  signedUrl: string;   // resolved from storage
  markedForDeletion: boolean;
}

export interface CustomerFormOutput {
  formValue: {
    firstName: string;
    secondName: string;
    lastName: string;
    dni: string;
    phone: string;
    email: string;
    guaranteePersonId: string;
    paymentGrade: PaymentGrade;
    location: string;
    profession: string;
    company: string;
    income: number;
    notes: string;
    withSpouse: boolean;
    spouse?: {
      firstName: string;
      secondName: string;
      lastName: string;
      dni: string;
      phone: string;
      profession: string;
      income: number;
      location: string;
    };
  };
  rawFiles: File[];
}

const GRADE_MAP: Record<string, PaymentGrade> = {
  A: '1', B: '2', C: '3', D: '4', E: '5',
};

@Component({
  selector: 'app-customer-form',
  standalone: true,
  templateUrl: './customer-form.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NzTooltipModule, NgZorroModule, WebIconComponent],
  styles: `
    .section__wrapper { @apply space-y-5 }
    .section__header  { @apply font-sans text-xs font-bold uppercase text-highContrast }
    .section__line    { @apply font-sans flex gap-2.5 }
    .text-help        { @apply uppercase text-xs text-standardGray font-medium }
    .field__error     { @apply text-xs text-red-500 mt-1 }
  `
})
export class CustomerFormComponent implements OnInit, OnDestroy {
  @Input() entityId?: string;
  @Input() isLoading: boolean = false;

  @Output() submitForm = new EventEmitter<CustomerFormOutput>();
  @Output() closeDrawer = new EventEmitter<void>();

  readonly professions: ProfessionOption[] = PROFESSION_LIST;
  readonly isCustomProfession = signal<boolean>(false);
  readonly isCustomSpouseProfession = signal<boolean>(false);

  existingImages = signal<ExistingGalleryImage[]>([]);
  linkedGuaranteePerson = signal<GuaranteePerson | null>(null);

  // ── Guarantee person search ──────────────────────────────────────────────

  guaranteeSearchResults = signal<GuaranteePerson[]>([]);
  selectedGuaranteePerson = signal<GuaranteePerson | null>(null);
  isSearchingGuarantee = signal<boolean>(false);
  private guaranteeSearch$ = new Subject<string>();

  private destroy$ = new Subject<void>();

  // ── Form ─────────────────────────────────────────────────────────────────

  form: FormGroup = new FormGroup({
    firstName: new FormControl('', [Validators.required, Validators.maxLength(25)]),
    secondName: new FormControl('', [Validators.maxLength(25)]),
    lastName: new FormControl('', [Validators.required, Validators.maxLength(25)]),
    dni: new FormControl('', [Validators.required, dniValidator]),
    phone: new FormControl('', [Validators.required, phoneValidator]),
    email: new FormControl('', [Validators.email]),
    guaranteePersonId: new FormControl<string | null>(null, Validators.required),
    guaranteeSearch: new FormControl(''),   // display-only search input
    isWithSpouse: new FormControl(false),
    radioEntityGrade: new FormControl<string>('A', Validators.required),
    location: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    professionSelect: new FormControl<string | null>(null, Validators.required),
    professionCustom: new FormControl(''),
    company: new FormControl(''),
    income: new FormControl<number | null>(null, [Validators.required, incomeValidator]),
    notes: new FormControl('', [Validators.maxLength(500)]),

    spouse: new FormGroup({
      firstName: new FormControl(''),
      secondName: new FormControl(''),
      lastName: new FormControl(''),
      dni: new FormControl(''),
      phone: new FormControl(''),
      professionSelect: new FormControl<string | null>(null),
      professionCustom: new FormControl(''),
      income: new FormControl<number | null>(null),
      location: new FormControl('')
    })
  });

  mediaFiles = signal<NzUploadFile[]>([]);
  private rawFiles: File[] = [];

  /** Maps DB payment_grade number back to UI letter */
  private gradeToLetter(grade: string): string {
    const map: Record<string, string> = {
      '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E'
    };
    return map[grade.trim()] ?? 'A';
  }

  constructor(private entitiesService: EntitiesService) { }

  ngOnInit(): void {
    // Profession select → custom input
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

    // Spouse profession select → custom input
    this.form.get('spouse.professionSelect')!
      .valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        const isOther = val === 'otro';
        this.isCustomSpouseProfession.set(isOther);
        const customCtrl = this.form.get('spouse.professionCustom')!;
        if (isOther) {
          customCtrl.setValidators([Validators.required, Validators.maxLength(25)]);
        } else {
          customCtrl.clearValidators();
          customCtrl.setValue('');
        }
        customCtrl.updateValueAndValidity();
      });

    // Spouse toggle → add/remove validators
    this.form.get('isWithSpouse')!
      .valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.toggleSpouseValidators(value));

    // Guarantee person search with debounce
    this.guaranteeSearch$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
        switchMap(query => {
          if (!query || query.length < 2) {
            this.guaranteeSearchResults.set([]);
            return of([]);
          }
          this.isSearchingGuarantee.set(true);
          return this.entitiesService.getGuaranteePersons(query);
        })
      )
      .subscribe({
        next: results => {
          this.guaranteeSearchResults.set(results as GuaranteePerson[]);
          this.isSearchingGuarantee.set(false);
        },
        error: () => this.isSearchingGuarantee.set(false)
      });

    if (this.entityId) {
      // TODO: load from Supabase
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private toggleSpouseValidators(enabled: boolean): void {
    const spouseGroup = this.form.get('spouse') as FormGroup;
    const fields: Record<string, any[]> = {
      firstName: [Validators.required, Validators.maxLength(25)],
      secondName: [Validators.maxLength(25)],
      lastName: [Validators.required, Validators.maxLength(25)],
      dni: [Validators.required, dniValidator],
      phone: [Validators.required, phoneValidator],
      professionSelect: [Validators.required],
      income: [Validators.required, incomeValidator],
      location: [Validators.maxLength(100)]
    };

    Object.entries(fields).forEach(([key, validators]) => {
      const ctrl = spouseGroup.get(key)!;
      if (enabled) {
        ctrl.setValidators(validators);
      } else {
        ctrl.clearValidators();
        ctrl.setValue(key === 'income' ? null : '');
      }
      ctrl.updateValueAndValidity();
    });

    if (!enabled) {
      this.isCustomSpouseProfession.set(false);
    }
  }

  onDniInput(event: Event, controlPath: string): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 13);
    let formatted = digits;
    if (digits.length > 8) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    this.form.get(controlPath)!.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  onPhoneInput(event: Event, controlPath: string): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length > 4
      ? `${digits.slice(0, 4)}-${digits.slice(4)}`
      : digits;
    this.form.get(controlPath)!.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  onNumericKeydown(event: KeyboardEvent): void {
    const allowed = [
      'Backspace', 'Delete', 'Tab',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];
    if (allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  // ── Guarantee search ─────────────────────────────────────────────────────

  onGuaranteeSearch(value: string): void {
    this.guaranteeSearch$.next(value);
  }

  selectGuaranteePerson(person: GuaranteePerson): void {
    this.selectedGuaranteePerson.set(person);
    this.form.get('guaranteePersonId')!.setValue(person.id);
    // Show full name in the search input
    const fullName = [person.first_name, person.second_name, person.last_names]
      .filter(Boolean).join(' ');
    this.form.get('guaranteeSearch')!.setValue(fullName, { emitEvent: false });
    this.guaranteeSearchResults.set([]); // close dropdown
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  isInvalid(controlPath: string): boolean {
    const ctrl = this.form.get(controlPath);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }

  private markAllTouched(): void {
    Object.values(this.form.controls).forEach(ctrl => {
      ctrl.markAsTouched();
      if (ctrl instanceof FormGroup) {
        Object.values(ctrl.controls).forEach(c => c.markAsTouched());
      }
    });
  }

  /** Toggles markedForDeletion on an existing image */
  toggleImageDeletion(fileName: string): void {
    this.existingImages.update(images =>
      images.map(img =>
        img.fileName === fileName
          ? { ...img, markedForDeletion: !img.markedForDeletion }
          : img
      )
    );
  }

  /** Returns filenames marked for deletion */
  get imagesToDelete(): string[] {
    return this.existingImages().filter(i => i.markedForDeletion).map(i => i.fileName);
  }

  /** Returns filenames NOT marked for deletion (surviving gallery) */
  get survivingImageFileNames(): string[] {
    return this.existingImages().filter(i => !i.markedForDeletion).map(i => i.fileName);
  }

  /**
 * Called by the parent edit drawer after fetching customer data.
 * Patches the form and loads signed URLs for existing gallery images.
 */
  loadForEdit(
    data: CustomerForEdit,
    signedUrls: Record<string, string>,
    professionList: ProfessionOption[]
  ): void {
    const { customer, guaranteePerson, spouse } = data;

    // Resolve profession — check if it's in the predefined list or custom
    const knownProfession = professionList.find(p => p.value === customer.profession);
    const professionSelect = knownProfession ? customer.profession : 'otro';
    const professionCustom = knownProfession ? '' : customer.profession;

    this.form.patchValue({
      firstName: customer.first_name,
      secondName: customer.second_name,
      lastName: customer.last_names,
      dni: customer.dni.trim(),
      phone: customer.phone_numbers?.[0] ?? '',
      email: customer.email ?? '',
      guaranteePersonId: customer.guaranteePerson_id ?? null,
      guaranteeSearch: guaranteePerson
        ? [guaranteePerson.first_name, guaranteePerson.second_name, guaranteePerson.last_names]
          .filter(Boolean).join(' ')
        : '',
      radioEntityGrade: this.gradeToLetter(customer.payment_grade),
      location: customer.location ?? '',
      professionSelect,
      professionCustom,
      company: customer.company ?? '',
      income: customer.income,
      notes: customer.comment ?? '',
      isWithSpouse: !!spouse,
    });

    // Patch spouse sub-form if present
    if (spouse) {
      const knownSpouseProfession = professionList.find(p => p.value === spouse.profession);
      this.form.patchValue({
        spouse: {
          firstName: spouse.first_name,
          secondName: spouse.second_name,
          lastName: spouse.last_names,
          dni: spouse.dni.trim(),
          phone: spouse.phone_numbers?.[0] ?? '',
          professionSelect: knownSpouseProfession ? spouse.profession : 'otro',
          professionCustom: knownSpouseProfession ? '' : spouse.profession,
          income: spouse.income,
          location: spouse.location ?? '',
        }
      });
      this.toggleSpouseValidators(true);
    }

    // Load signed URLs for existing gallery images
    const images: ExistingGalleryImage[] = customer.gallery.map((fileName: string) => ({
      fileName,
      signedUrl: signedUrls[fileName] ?? '',
      markedForDeletion: false
    }));
    this.existingImages.set(images);

    // Store linked guarantee person for display
    this.linkedGuaranteePerson.set(guaranteePerson);
    if (guaranteePerson) {
      this.selectedGuaranteePerson.set(guaranteePerson);
    }
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

  resetForm(): void {
    this.form.reset({
      firstName: '',
      secondName: '',
      lastName: '',
      dni: '',
      phone: '',
      email: '',
      guaranteePersonId: null,
      guaranteeSearch: '',
      isWithSpouse: false,
      radioEntityGrade: 'A',
      location: '',
      professionSelect: null,
      professionCustom: '',
      company: '',
      income: null,
      notes: '',
      spouse: {
        firstName: '', secondName: '', lastName: '',
        dni: '', phone: '', professionSelect: null,
        professionCustom: '', income: null, location: ''
      }
    });

    this.mediaFiles.set([]);
    this.rawFiles = [];
    this.isCustomProfession.set(false);
    this.isCustomSpouseProfession.set(false);
    this.selectedGuaranteePerson.set(null);
    this.guaranteeSearchResults.set([]);
    this.existingImages.set([]);
    this.linkedGuaranteePerson.set(null);

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

    const profession = raw.professionSelect === 'otro'
      ? raw.professionCustom
      : raw.professionSelect;

    const spouseProfession = raw.spouse.professionSelect === 'otro'
      ? raw.spouse.professionCustom
      : raw.spouse.professionSelect;

    this.submitForm.emit({
      formValue: {
        firstName: raw.firstName,
        secondName: raw.secondName ?? '',
        lastName: raw.lastName,
        dni: raw.dni,
        phone: raw.phone,
        email: raw.email ?? '',
        guaranteePersonId: raw.guaranteePersonId,
        paymentGrade: GRADE_MAP[raw.radioEntityGrade] ?? '1',
        location: raw.location ?? '',
        profession,
        company: raw.company ?? '',
        income: Number(raw.income),
        notes: raw.notes ?? '',
        withSpouse: raw.isWithSpouse,
        spouse: raw.isWithSpouse ? {
          firstName: raw.spouse.firstName,
          secondName: raw.spouse.secondName ?? '',
          lastName: raw.spouse.lastName,
          dni: raw.spouse.dni,
          phone: raw.spouse.phone,
          profession: spouseProfession,
          income: Number(raw.spouse.income),
          location: raw.spouse.location ?? ''
        } : undefined
      },
      rawFiles: [...this.rawFiles]
    });
  }
}