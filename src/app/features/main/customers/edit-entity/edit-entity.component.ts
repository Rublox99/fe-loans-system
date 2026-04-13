import {
  Component, EventEmitter, Input,
  OnDestroy, Output,
  ViewChild, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { CustomerFormComponent, CustomerFormOutput } from '../entities-forms/customer-form.component';
import { GuaranteeFormComponent, GuaranteeFormOutput } from '../entities-forms/guarantee-form.component';
import { CustomerForEdit } from '../../../../core/interfaces/customers.interface';
import { EntitiesService } from '../../../../core/services/pages/entities.service';
import { StorageService } from '../../../../core/services/storage.service';
import { GeneralService } from '../../../../core/services/general.service';
import { AuthService } from '../../../../core/services/pages/auth.service';
import { PROFESSION_LIST, SUPABASE_BUCKETS } from '../../../../shared/constants';
import { GuaranteePersonForEdit } from '../../../../core/interfaces/guarantee-person.interface';

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
export class EditEntityDrawerComponent implements OnDestroy {
  @Input() entityId!: string;
  @Input() entityType!: 'C' | 'A';

  @Output() entityUpdated = new EventEmitter<void>();

  @ViewChild(CustomerFormComponent)
  private customerForm!: CustomerFormComponent;

  @ViewChild(GuaranteeFormComponent)
  private guaranteeForm!: GuaranteeFormComponent;

  isVisible = false;
  isLoading = false;
  isFetching = signal(false);

  private loadedCustomerData: CustomerForEdit | null = null;
  private loadedGuaranteeData: GuaranteePersonForEdit | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private entitiesService: EntitiesService,
    private storageService: StorageService,
    private generalService: GeneralService
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Drawer open/close ─────────────────────────────────────────────────────

  openDrawer(): void {
    this.isVisible = true;
    this.loadEntityData();
  }

  closeDrawer(): void {
    this.isVisible = false;
    this.loadedCustomerData = null;
    this.loadedGuaranteeData = null;
  }

  getDrawerTitle(): string {
    return this.entityType === 'C'
      ? 'Modificación de Cliente'
      : 'Modificación de Aval';
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  private loadEntityData(): void {
    if (this.entityType === 'C') {
      this.loadCustomerData();
    } else {
      this.loadGuaranteeData();
    }
  }

  private loadCustomerData(): void {
    this.isFetching.set(true);

    this.entitiesService
      .getCustomerForEdit(this.entityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (data) => {
          this.loadedCustomerData = data;

          const signedUrls = await this.storageService.getSignedUrls(
            SUPABASE_BUCKETS.ENTITIES_GALLERIES,
            data.customer.id,
            data.customer.gallery,
            3600
          );

          this.isFetching.set(false);

          setTimeout(() => {
            this.customerForm?.loadForEdit(data, signedUrls, PROFESSION_LIST);
          }, 0);
        },
        error: (err) => {
          console.error('loadCustomerData error:', err);
          this.generalService.createMessage('error', 'Error al cargar los datos del cliente.');
          this.isFetching.set(false);
          this.closeDrawer();
        }
      });
  }

  private loadGuaranteeData(): void {
    this.isFetching.set(true);

    this.entitiesService
      .getGuaranteePersonForEdit(this.entityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (data) => {
          this.loadedGuaranteeData = data;

          const signedUrls = await this.storageService.getSignedUrls(
            SUPABASE_BUCKETS.ENTITIES_GALLERIES,
            data.id,
            data.gallery,
            3600
          );

          this.isFetching.set(false);

          setTimeout(() => {
            this.guaranteeForm?.loadForEdit(data, signedUrls, PROFESSION_LIST);
          }, 0);
        },
        error: (err) => {
          console.error('loadGuaranteeData error:', err);
          this.generalService.createMessage('error', 'Error al cargar los datos del aval.');
          this.isFetching.set(false);
          this.closeDrawer();
        }
      });
  }

  // ── Update flows ──────────────────────────────────────────────────────────

  async handleCustomer(output: CustomerFormOutput): Promise<void> {
    if (this.isLoading || !this.loadedCustomerData) return;
    this.isLoading = true;

    try {
      const { customer: original, spouse: originalSpouse } = this.loadedCustomerData;
      const { formValue, rawFiles } = output;

      // ── 1. Spouse handling ───────────────────────────────────────────────

      let spouseId: string | null = original.spouse_id ?? null;

      if (formValue.withSpouse && formValue.spouse) {
        if (originalSpouse) {
          const { error: spouseError } = await this.entitiesService.updateSpouse(
            originalSpouse.id,
            {
              firstName: formValue.spouse.firstName,
              secondName: formValue.spouse.secondName,
              lastName: formValue.spouse.lastName,
              dni: formValue.spouse.dni,
              phone: formValue.spouse.phone,
              location: formValue.spouse.location,
              profession: formValue.spouse.profession,
              income: formValue.spouse.income,
            }
          );
          if (spouseError) {
            this.generalService.createMessage('error', `Error al actualizar el cónyuge: ${spouseError}`);
            return;
          }
          spouseId = originalSpouse.id;

        } else {
          const { data: newSpouse, error: spouseError } = await this.entitiesService.insertSpouse({
            firstName: formValue.spouse.firstName,
            secondName: formValue.spouse.secondName,
            lastName: formValue.spouse.lastName,
            dni: formValue.spouse.dni,
            phone: formValue.spouse.phone,
            location: formValue.spouse.location,
            profession: formValue.spouse.profession,
            income: formValue.spouse.income,
          });
          if (spouseError || !newSpouse) {
            this.generalService.createMessage('error', `Error al registrar el cónyuge: ${spouseError}`);
            return;
          }
          spouseId = newSpouse.id;
        }

      } else if (!formValue.withSpouse && originalSpouse) {
        const { error: deleteError } = await this.entitiesService.unlinkAndDeleteSpouse(
          this.entityId,
          originalSpouse.id
        );
        if (deleteError) {
          this.generalService.createMessage('error', `Error al eliminar el cónyuge: ${deleteError}`);
          return;
        }
        spouseId = null;
      }

      // ── 2. Gallery handling ──────────────────────────────────────────────

      const imagesToDelete = this.customerForm.imagesToDelete;
      const survivingImages = this.customerForm.survivingImageFileNames;

      if (imagesToDelete.length > 0) {
        const { error: deleteError } = await this.storageService.deleteEntityGalleryFiles(
          this.entityId,
          imagesToDelete
        );
        if (deleteError) {
          this.generalService.createMessage(
            'error',
            'Algunos archivos no se pudieron eliminar del almacenamiento.'
          );
        }
      }

      let newFileNames: string[] = [];
      if (rawFiles.length > 0) {
        newFileNames = await this.storageService.uploadEntityGallery(
          this.entityId,
          rawFiles,
          true
        );
      }

      const finalGallery = [...survivingImages, ...newFileNames];

      // ── 3. Update customer ───────────────────────────────────────────────

      const { error: updateError } = await this.entitiesService.updateCustomer(
        this.entityId,
        {
          firstName: formValue.firstName,
          secondName: formValue.secondName,
          lastName: formValue.lastName,
          dni: formValue.dni,
          phone: formValue.phone,
          email: formValue.email,
          location: formValue.location,
          profession: formValue.profession,
          company: formValue.company,
          income: formValue.income,
          paymentGrade: formValue.paymentGrade,
          gallery: finalGallery,
          notes: formValue.notes,
          spouseId,
          guaranteePersonId: formValue.guaranteePersonId,
        }
      );

      if (updateError) {
        this.generalService.createMessage('error', `Error al actualizar el cliente: ${updateError}`);
        return;
      }

      this.generalService.createMessage('success', 'Cliente actualizado exitosamente.');
      this.entityUpdated.emit();
      this.closeDrawer();

    } catch (err) {
      console.error('handleCustomer (edit) error:', err);
      this.generalService.createMessage('error', 'Ocurrió un error inesperado.');
    } finally {
      this.isLoading = false;
    }
  }

  async handleGuarantee(output: GuaranteeFormOutput): Promise<void> {
    if (this.isLoading || !this.loadedGuaranteeData) return;
    this.isLoading = true;

    try {
      const { formValue, rawFiles } = output;

      // ── 1. Gallery handling ──────────────────────────────────────────────

      const imagesToDelete = this.guaranteeForm.imagesToDelete;
      const survivingImages = this.guaranteeForm.survivingImageFileNames;

      if (imagesToDelete.length > 0) {
        const { error: deleteError } = await this.storageService.deleteEntityGalleryFiles(
          this.entityId,
          imagesToDelete
        );
        if (deleteError) {
          this.generalService.createMessage(
            'error',
            'Algunos archivos no se pudieron eliminar del almacenamiento.'
          );
        }
      }

      let newFileNames: string[] = [];
      if (rawFiles.length > 0) {
        newFileNames = await this.storageService.uploadEntityGallery(
          this.entityId,
          rawFiles,
          true
        );
      }

      const finalGallery = [...survivingImages, ...newFileNames];

      // ── 2. Update guarantee person ───────────────────────────────────────

      const { error: updateError } = await this.entitiesService.updateGuaranteePerson(
        this.entityId,
        {
          firstName: formValue.firstName,
          secondName: formValue.secondName,
          lastName: formValue.lastName,
          dni: formValue.dni,
          phone: formValue.phone,
          email: formValue.email,
          location: formValue.location,
          profession: formValue.profession,
          company: formValue.company,
          income: formValue.income,
          paymentGrade: formValue.paymentGrade,
          gallery: finalGallery,
          notes: formValue.notes,
        }
      );

      if (updateError) {
        this.generalService.createMessage('error', `Error al actualizar el aval: ${updateError}`);
        return;
      }

      this.generalService.createMessage('success', 'Aval actualizado exitosamente.');
      this.entityUpdated.emit();
      this.closeDrawer();

    } catch (err) {
      console.error('handleGuarantee (edit) error:', err);
      this.generalService.createMessage('error', 'Ocurrió un error inesperado.');
    } finally {
      this.isLoading = false;
    }
  }
}