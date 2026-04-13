import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { Customer } from '../../../../core/interfaces/customers.interface';
import { EntitiesService } from '../../../../core/services/pages/entities.service';
import { StorageService } from '../../../../core/services/storage.service';
import { Spouse } from '../../../../core/interfaces/spouse.interface';
import { SUPABASE_BUCKETS } from '../../../../shared/constants';
import { Entity } from '../../../../core/types/entity.type';
import { GuaranteePerson } from '../../../../core/interfaces/guarantee-person.interface';

@Component({
  selector: 'app-view-entity',
  standalone: true,
  templateUrl: './view-entity.component.html',
  imports: [
    CommonModule,
    WebIconComponent,
    FormsModule,
    NgZorroModule
  ],
  styles: `
    .section__wrapper {
      @apply space-y-2.5
    }
    .section__header {
      @apply font-sans text-xs font-bold uppercase text-highContrast
    }
    .section__line {
      @apply font-sans flex gap-2.5 text-base
    }
    .section__line-left {
      @apply flex-1
    }
    .section__line-right {
      @apply flex-none
    }
  `
})
export class ViewEntityDrawerComponent {

  /** Pre-resolved entity passed directly from the table row */
  @Input() set entity(value: Entity | null | undefined) {
    if (value) this._entity.set(value);
  }

  /**
   * Fallback: resolve a Customer by id (used from loan-details context).
   * When supplied, _kind is implicitly 'C'.
   */
  @Input() customerId?: string;

  @Input() isViewableFromLoanDetails: boolean = false;

  isVisible = false;

  private _entity = signal<Entity | null>(null);

  // Derived from _entity for template convenience
  get resolvedEntity(): Entity | null { return this._entity(); }

  isLoadingEntity = signal(false);
  errorEntity = signal<string | null>(null);

  isLoadingGuaranteePerson = signal(false);
  errorGuaranteePerson = signal<string | null>(null);
  guaranteePerson = signal<GuaranteePerson | null>(null);

  isLoadingSpouse = signal(false);
  errorSpouse = signal<string | null>(null);
  spouse = signal<Spouse | null>(null);

  isLoadingGallery = signal(false);
  galleryUrls = signal<string[]>([]);

  constructor(
    private entitiesService: EntitiesService,
    private storageService: StorageService
  ) { }

  isCustomer(entity: Entity): entity is Customer & { _kind: 'C' } {
    return entity._kind === 'C';
  }

  getEntityTitle(): string {
    const e = this._entity();
    if (!e) return 'Visualización de Individuo';
    return e._kind === 'C' ? 'Visualización de Cliente' : 'Visualización de Aval';
  }

  getPaymentGradeLabel(grade: string | null | undefined): string {
    const labels: Record<string, string> = {
      '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E'
    };
    return grade ? (labels[grade] ?? grade) : '—';
  }

  getFullName(entity: { first_name: string; second_name: string; last_names: string }): string {
    return [entity.first_name, entity.second_name, entity.last_names]
      .filter(Boolean)
      .join(' ');
  }

  /** Primary phone for display — handles both array and scalar variants */
  getPrimaryPhone(entity: Entity): string {
    if (this.isCustomer(entity)) {
      return entity.phone_numbers?.[0] ?? '—';
    }
    return entity.phone_number ?? '—';
  }

  formatIncome(income: number): string {
    return `L ${income.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  openDrawer() {
    this.isVisible = true;
    this.resetRelations();

    const e = this._entity();

    if (e) {
      this.resolveGalleryUrls(e);
      if (this.isCustomer(e)) {
        this.resolveCustomerRelations(e);
      }
    } else if (this.customerId) {
      this.fetchCustomerById(this.customerId);
    }
  }

  closeDrawer() {
    this.isVisible = false;
  }

  private resetRelations() {
    this.guaranteePerson.set(null);
    this.spouse.set(null);
    this.galleryUrls.set([]);
    this.errorGuaranteePerson.set(null);
    this.errorSpouse.set(null);
    this.errorEntity.set(null);
  }

  private async resolveGalleryUrls(entity: Entity) {
    if (!entity.gallery?.length) {
      this.galleryUrls.set([]);
      return;
    }

    this.isLoadingGallery.set(true);

    const urls = await Promise.all(
      entity.gallery.map(filename =>
        this.storageService.getSignedUrl(
          SUPABASE_BUCKETS.ENTITIES_GALLERIES,
          `${entity.id}/${filename}`
        )
      )
    );

    this.galleryUrls.set(urls.filter((url): url is string => url !== null));
    this.isLoadingGallery.set(false);
  }

  private resolveCustomerRelations(customer: Customer & { _kind: 'C' }) {
    if (customer.guaranteePerson_id) {
      this.fetchGuaranteePerson(customer.guaranteePerson_id);
    }
    if (customer.spouse_id) {
      this.fetchSpouse(customer.spouse_id);
    }
  }

  private fetchCustomerById(id: string) {
    this.isLoadingEntity.set(true);
    this.errorEntity.set(null);

    this.entitiesService.getCustomerById(id).subscribe({
      next: (data) => {
        if (data) {
          const entity = { ...data, _kind: 'C' as const };
          this._entity.set(entity);
          this.resolveGalleryUrls(entity);
          this.resolveCustomerRelations(entity);
        }
        this.isLoadingEntity.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorEntity.set('Error cargando información del cliente');
        this.isLoadingEntity.set(false);
      }
    });
  }

  private fetchGuaranteePerson(id: string) {
    this.isLoadingGuaranteePerson.set(true);
    this.errorGuaranteePerson.set(null);

    this.entitiesService.getGuaranteePersonById(id).subscribe({
      next: (data) => {
        this.guaranteePerson.set(data);
        this.isLoadingGuaranteePerson.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorGuaranteePerson.set('Error cargando información del aval');
        this.isLoadingGuaranteePerson.set(false);
      }
    });
  }

  private fetchSpouse(id: string) {
    this.isLoadingSpouse.set(true);
    this.errorSpouse.set(null);

    this.entitiesService.getSpouseById(id).subscribe({
      next: (data) => {
        this.spouse.set(data);
        this.isLoadingSpouse.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorSpouse.set('Error cargando información del cónyuge');
        this.isLoadingSpouse.set(false);
      }
    });
  }
}