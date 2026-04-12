import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormsModule, ValidationErrors } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { CustomerFormComponent, CustomerFormOutput } from '../entities-forms/customer-form.component';
import { GuaranteeFormComponent, GuaranteeFormOutput } from '../entities-forms/guarantee-form.component';
import { EntitiesService } from '../../../../core/services/pages/entities.service';
import { StorageService } from '../../../../core/services/storage.service';
import { GeneralService } from '../../../../core/services/general.service';
import { AuthService } from '../../../../core/services/pages/auth.service';

export function dniValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  // Strip dashes and check for exactly 13 digits
  const digits = (control.value as string).replace(/-/g, '');
  return /^\d{13}$/.test(digits) ? null : { dniInvalid: true };
}

export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  // Expects xxxx-xxxx (8 digits + 1 dash)
  return /^\d{4}-\d{4}$/.test(control.value) ? null : { phoneInvalid: true };
}

export function incomeValidator(control: AbstractControl): ValidationErrors | null {
  const val = Number(control.value);
  if (isNaN(val)) return { incomeInvalid: true };
  if (val <= 0) return { incomeMin: true };
  if (val > 999999.00) return { incomeMax: true };
  return null;
}

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
    .section__wrapper { @apply space-y-5 }
    .section__header  { @apply font-sans text-xs font-bold uppercase text-highContrast }
    .section__line    { @apply font-sans flex gap-2.5 }
    .text-help        { @apply uppercase text-xs text-standardGray font-medium }
  `
})
export class AddEntityDrawerComponent implements OnInit {
  @ViewChild(GuaranteeFormComponent)
  private guaranteeForm!: GuaranteeFormComponent;
  @ViewChild(CustomerFormComponent)
  private customerForm!: GuaranteeFormComponent;

  @Output() entityInserted = new EventEmitter<void>();

  isVisible = false;
  isLoading = false;
  radioEntityType = 'C'; // C: Customer | G: Guarantee

  constructor(
    private entitiesService: EntitiesService,
    private storageService: StorageService,
    private generalService: GeneralService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void { }

  openDrawer(): void { this.isVisible = true; }
  closeDrawer(): void { this.isVisible = false; }

  async handleCustomer(output: CustomerFormOutput): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const user = await this.authService.currentUser;
      if (!user?.id) {
        this.generalService.createMessage('error', 'No se encontró el usuario autenticado.');
        return;
      }

      let spouseId: string | undefined;
      if (output.formValue.withSpouse && output.formValue.spouse) {
        const { data: insertedSpouse, error: spouseError } =
          await this.entitiesService.insertSpouse({
            firstName: output.formValue.spouse.firstName,
            secondName: output.formValue.spouse.secondName,
            lastName: output.formValue.spouse.lastName,
            dni: output.formValue.spouse.dni,
            phone: output.formValue.spouse.phone,
            location: output.formValue.spouse.location,
            profession: output.formValue.spouse.profession,
            income: output.formValue.spouse.income,
          });

        if (spouseError || !insertedSpouse) {
          this.generalService.createMessage('error', `Error al registrar el cónyuge: ${spouseError}`);
          return;
        }

        spouseId = insertedSpouse.id;
      }

      const { data: inserted, error: insertError } =
        await this.entitiesService.insertCustomer({
          userId: user.id,
          firstName: output.formValue.firstName,
          secondName: output.formValue.secondName,
          lastName: output.formValue.lastName,
          dni: output.formValue.dni,
          phone: output.formValue.phone,
          email: output.formValue.email,
          location: output.formValue.location,
          profession: output.formValue.profession,
          company: output.formValue.company,
          income: output.formValue.income,
          paymentGrade: output.formValue.paymentGrade,
          gallery: [],
          notes: output.formValue.notes,
          spouseId,
          guaranteePersonId: output.formValue.guaranteePersonId,
        });

      if (insertError || !inserted) {
        this.generalService.createMessage('error', `Error al crear el cliente: ${insertError}`);
        return;
      }

      if (output.rawFiles.length > 0) {
        const gallery = await this.storageService.uploadEntityGallery(
          inserted.id,
          output.rawFiles
        );

        if (gallery.length > 0) {
          const { error: updateError } = await this.entitiesService.updateCustomerGallery(
            inserted.id,
            gallery
          );

          if (updateError) {
            this.generalService.createMessage(
              'error',
              'El cliente fue creado, pero algunas imágenes no se pudieron guardar.'
            );
            return;
          }
        }
      }

      this.customerForm.resetForm();
      this.generalService.createMessage('success', 'Cliente registrado exitosamente.');
      this.entityInserted.emit();
      this.closeDrawer();
    } catch (err) {
      console.error('handleCustomer error:', err);
      this.generalService.createMessage('error', 'Ocurrió un error inesperado.');
    } finally {
      this.isLoading = false;
    }
  }

  async handleGuarantee(output: GuaranteeFormOutput): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const user = await this.authService.currentUser;
      if (!user?.id) {
        this.generalService.createMessage('error', 'No se encontró el usuario autenticado.');
        return;
      }

      const { data: inserted, error: insertError } = await this.entitiesService.insertGuaranteePerson({
        userId: user.id,
        firstName: output.formValue.firstName,
        secondName: output.formValue.secondName,
        lastName: output.formValue.lastName,
        dni: output.formValue.dni,
        email: output.formValue.email,
        phone: output.formValue.phone,
        location: output.formValue.location,
        profession: output.formValue.profession,
        company: output.formValue.company,
        income: output.formValue.income,
        paymentGrade: output.formValue.paymentGrade,
        gallery: [],
        notes: output.formValue.notes,
      });

      if (insertError || !inserted) {
        this.generalService.createMessage('error', `Error al crear el aval: ${insertError}`);
        return;
      }

      if (output.rawFiles.length > 0) {
        const gallery = await this.storageService.uploadEntityGallery(
          inserted.id,
          output.rawFiles
        );

        if (gallery.length > 0) {
          const { error: updateError } = await this.entitiesService.updateGuaranteePersonGallery(
            inserted.id,
            gallery
          );

          if (updateError) {
            this.generalService.createMessage(
              'error',
              'El aval fue creado, pero algunas imágenes no se pudieron guardar.'
            );
            return;
          }
        }
      }

      this.guaranteeForm.resetForm();
      this.generalService.createMessage('success', 'Aval registrado exitosamente.');
      this.entityInserted.emit();
      this.closeDrawer();
    } catch (err) {
      console.error('handleGuarantee error:', err);
      this.generalService.createMessage('error', 'Ocurrió un error inesperado.');
    } finally {
      this.isLoading = false;
    }
  }
}