import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Customer } from '../interfaces/customers.interface';
import { REPORT_CUSTOMERS_MOCK } from '../../shared/mocks/report-customers';
import { ReportCustomer } from '../interfaces/report-customers.interface';

export interface PaginatedCustomers {
    data: ReportCustomer[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReportCustomersService {

    getReportCustomers(search?: string, page: number = 1, pageSize: number = 10): Observable<PaginatedCustomers> {
        let filtered = REPORT_CUSTOMERS_MOCK;

        if (search) {
            filtered = REPORT_CUSTOMERS_MOCK.filter(c =>
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

    getCustomerById(id: string): Observable<ReportCustomer | undefined> {
        return of(REPORT_CUSTOMERS_MOCK.find(c => c.id === id));
    }
}
