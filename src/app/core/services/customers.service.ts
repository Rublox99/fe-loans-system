import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Customer } from '../interfaces/customers.interface';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface PaginatedCustomers {
    data: Customer[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class CustomersService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabase.url,
            environment.supabase.key
        );
    }

    getCustomers(search?: string, page: number = 1, pageSize: number = 10): Observable<PaginatedCustomers> {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        let query = this.supabase
            .from('customers')
            .select('*', { count: 'exact' })
            .range(start, end);

        if (search) {
            query = query.ilike('first_name', `%${search}%`);
        }

        return from(query).pipe(
            map(({ data, count, error }) => {
                if (error) throw error;

                return {
                    data: data as Customer[],
                    total: count ?? 0
                };
            })
        );
    }

    getCustomerById(id: string): Observable<Customer | undefined> {
        return from(
            this.supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;

                return data as Customer;
            })
        );
    }
}