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
import { GuaranteeFormComponent } from '../entities-forms/guarantee-form.component';
import { CustomerForEdit } from '../../../../core/interfaces/customers.interface';
import { EntitiesService } from '../../../../core/services/pages/entities.service';
import { StorageService } from '../../../../core/services/storage.service';
import { GeneralService } from '../../../../core/services/general.service';
import { AuthService } from '../../../../core/services/pages/auth.service';
import { PROFESSION_LIST, SUPABASE_BUCKETS } from '../../../../shared/constants';

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
  @Input() customerId!: string;
  @Input() entityType!: 'C' | 'G';

  @Output() entityUpdated = new EventEmitter<void>();

  @ViewChild(CustomerFormComponent)
  private customerForm!: CustomerFormComponent;

  isVisible = false;
  isLoading = false;
  isFetching = signal(false);  // spinner while loading entity data

  /** Snapshot of the loaded data — needed for diffing spouse/gallery on update */
  private loadedData: CustomerForEdit | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private entitiesService: EntitiesService,
    private storageService: StorageService,
    private generalService: GeneralService,
    private authService: AuthService
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
    this.loadedData = null;
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  private loadEntityData(): void {
    if (this.entityType !== 'C') return;

    this.isFetching.set(true);

    this.entitiesService
      .getCustomerForEdit(this.customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (data) => {
          this.loadedData = data;

          // Resolve signed URLs for all gallery images
          const signedUrls = await this.storageService.getSignedUrls(
            SUPABASE_BUCKETS.ENTITIES_GALLERIES,
            data.customer.id,
            data.customer.gallery,
            3600
          );

          this.isFetching.set(false);

          // Give Angular a tick to render the form before patching
          setTimeout(() => {
            this.customerForm?.loadForEdit(data, signedUrls, PROFESSION_LIST);
          }, 0);
        },
        error: (err) => {
          console.error('loadEntityData error:', err);
          this.generalService.createMessage('error', 'Error al cargar los datos de la entidad.');
          this.isFetching.set(false);
          this.closeDrawer();
        }
      });
  }

  // ── Update flow ───────────────────────────────────────────────────────────

  handleGuarantee() {
    /* TODO: Add functionality when able to edit a GuaranteePerson */
  }

  async handleCustomer(output: CustomerFormOutput): Promise<void> {
    if (this.isLoading || !this.loadedData) return;
    this.isLoading = true;

    try {
      const { customer: original, spouse: originalSpouse } = this.loadedData;
      const { formValue, rawFiles } = output;

      // ── 1. Spouse handling ───────────────────────────────────────────────

      let spouseId: string | null = original.spouse_id ?? null;

      if (formValue.withSpouse && formValue.spouse) {
        if (originalSpouse) {
          // Update existing spouse
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
          // Insert new spouse
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
        // User toggled spouse off → unlink and delete
        const { error: deleteError } = await this.entitiesService.unlinkAndDeleteSpouse(
          this.customerId,
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

      // Delete removed images from storage
      if (imagesToDelete.length > 0) {
        const { error: deleteError } = await this.storageService.deleteEntityGalleryFiles(
          this.customerId,
          imagesToDelete
        );
        if (deleteError) {
          this.generalService.createMessage(
            'error',
            'Algunos archivos no se pudieron eliminar del almacenamiento.'
          );
          // Non-blocking — continue with update
        }
      }

      // Upload new images
      let newFileNames: string[] = [];
      if (rawFiles.length > 0) {
        newFileNames = await this.storageService.uploadEntityGallery(
          this.customerId,
          rawFiles,
          true
        );
      }

      // Final gallery = surviving originals + newly uploaded
      const finalGallery = [...survivingImages, ...newFileNames];

      // ── 3. Update customer ───────────────────────────────────────────────

      const { error: updateError } = await this.entitiesService.updateCustomer(
        this.customerId,
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

      // ── 4. Success ───────────────────────────────────────────────────────

      this.generalService.createMessage('success', 'Cliente actualizado exitosamente.');
      this.entityUpdated.emit();  // ← triggers table refresh in parent
      this.closeDrawer();

    } catch (err) {
      console.error('handleCustomer (edit) error:', err);
      this.generalService.createMessage('error', 'Ocurrió un error inesperado.');
    } finally {
      this.isLoading = false;
    }
  }
}