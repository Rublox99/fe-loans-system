import { CommonModule } from '@angular/common';
import { Component, Input, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebIconComponent } from '../../../../shared/components/web-icon.component';
import { NgZorroModule } from '../../../../shared/modules/ng-zorro.module';
import { Customer } from '../../../../core/interfaces/customers.interface';
import { EntitiesService } from '../../../../core/services/pages/entities.service';
import { StorageService } from '../../../../core/services/storage.service';
import { GuaranteePerson } from '../../../../core/interfaces/guarantee-person.interface';
import { Spouse } from '../../../../core/interfaces/spouse.interface';
import { SUPABASE_BUCKETS } from '../../../../shared/constants';

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
  @Input() customer!: Customer;
  @Input() customerId?: string;
  @Input() isViewableFromLoanDetails: boolean = false;

  isVisible = false;

  // Customer state (only used when resolving from customerId)
  isLoadingCustomer = signal(false);
  errorCustomer = signal<string | null>(null);

  // Guarantee person state
  isLoadingGuaranteePerson = signal(false);
  errorGuaranteePerson = signal<string | null>(null);
  guaranteePerson = signal<GuaranteePerson | null>(null);

  // Spouse state
  isLoadingSpouse = signal(false);
  errorSpouse = signal<string | null>(null);
  spouse = signal<Spouse | null>(null);

  // Gallery state
  isLoadingGallery = signal(false);
  galleryUrls = signal<string[]>([]);

  constructor(
    private entitiesService: EntitiesService,
    private storageService: StorageService
  ) { }

  openDrawer() {
    this.isVisible = true;

    if (this.customer) {
      this.resolveGalleryUrls(this.customer);
      this.resolveRelations(this.customer);
    } else if (this.customerId) {
      this.fetchCustomer(this.customerId);
    }
  }

  closeDrawer() {
    this.isVisible = false;
  }

  getPaymentGradeLabel(grade: string): string {
    const labels: Record<string, string> = {
      '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E'
    };
    return labels[grade] ?? grade;
  }

  getFullName(entity: Customer | Spouse): string {
    return [entity.first_name, entity.second_name, entity.last_names]
      .filter(Boolean)
      .join(' ');
  }

  getGuaranteeFullName(gp: GuaranteePerson): string {
    return [gp.first_name, gp.second_name, gp.last_names]
      .filter(Boolean)
      .join(' ');
  }

  formatIncome(income: number): string {
    return `L ${income.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  private async resolveGalleryUrls(customer: Customer) {
    if (!customer.gallery?.length) {
      this.galleryUrls.set([]);
      return;
    }

    this.isLoadingGallery.set(true);

    const urls = await Promise.all(
      customer.gallery.map(async filename => {
        const path = `${customer.id}/${filename}`;

        const url = await this.storageService.getSignedUrl(
          SUPABASE_BUCKETS.ENTITIES_GALLERIES,
          `${customer.id}/${filename}`
        );
        
        return url;
      })
    );

    // Filter out any nulls from failed signed URL generations
    this.galleryUrls.set(urls.filter((url): url is string => url !== null));
    this.isLoadingGallery.set(false);
  }

  private fetchCustomer(id: string) {
    this.isLoadingCustomer.set(true);
    this.errorCustomer.set(null);

    this.entitiesService.getCustomerById(id).subscribe({
      next: (data) => {
        this.customer = data!;
        this.isLoadingCustomer.set(false);
        this.resolveGalleryUrls(data!);
        this.resolveRelations(data!);
      },
      error: (err) => {
        console.error(err);
        this.errorCustomer.set('Error cargando información del cliente');
        this.isLoadingCustomer.set(false);
      }
    });
  }

  private resolveRelations(customer: Customer) {
    if (customer.guaranteePerson_id) {       // corrected from guarantee_id
      this.fetchGuaranteePerson(customer.guaranteePerson_id);
    }

    if (customer.spouse_id) {
      this.fetchSpouse(customer.spouse_id);
    }
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