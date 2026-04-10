import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CUSTOMERS_MOCK } from '../../shared/mocks/customers.mock';
import { Customer } from '../interfaces/customers.interface';

export interface PaginatedCustomers {
    data: Customer[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class CustomersService {

    getCustomers(search?: string, page: number = 1, pageSize: number = 10): Observable<PaginatedCustomers> {
        let filtered = CUSTOMERS_MOCK;

        if (search) {
            filtered = CUSTOMERS_MOCK.filter(c =>
                `${c.first_name} ${c.last_names}`
                    .toLowerCase()
                    .includes(search.toLowerCase())
            );
        }

        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        return of({ data, total });
    }

    getCustomerById(id: string): Observable<Customer | undefined> {
        return of(CUSTOMERS_MOCK.find(c => c.id === id));
    }
}
