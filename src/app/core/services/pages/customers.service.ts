import { Injectable } from '@angular/core';
import { forkJoin, from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Customer } from '../../interfaces/customers.interface';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { GuaranteePerson } from '../../interfaces/guarantee-person.interface';
import { Spouse } from '../../interfaces/spouse.interface';

export interface PaginatedCustomers {
    data: Customer[];
    total: number;
}

export interface CustomerStats {
    totalActive: number;
    gradeA: number;
    gradeBC: number;
    gradeDE: number;
    newThisMonth: number;
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
            .select(`
            *,
            spouse:spouses!spouse_id (
                first_name,
                second_name,
                last_names,
                dni
            )
        `, { count: 'exact' })
            .range(start, end);

        if (search) {
            query = query.or(
                `first_name.ilike.%${search}%,second_name.ilike.%${search}%,last_names.ilike.%${search}%,dni.ilike.%${search}%`
            );
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

    getGuaranteePersonById(id: string | null): Observable<GuaranteePerson> {
        return from(
            this.supabase
                .from('guarantee_persons')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as GuaranteePerson;
            })
        );
    }

    getSpouseById(id: string): Observable<Spouse> {
        return from(
            this.supabase
                .from('spouses')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as Spouse;
            })
        );
    }

    getCustomerStats(): Observable<CustomerStats> {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        // head: true means only the count is retrieved, no rows are transferred
        const totalActive$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('state', 'Active')
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        const gradeA$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('payment_grade', '1')
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        const gradeBC$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .in('payment_grade', ['2', '3'])
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        const gradeDE$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .in('payment_grade', ['4', '5'])
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        const newThisMonth$ = from(
            this.supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', monthStart)
                .lte('created_at', monthEnd)
        ).pipe(map(({ count, error }) => {
            if (error) throw error;
            return count ?? 0;
        }));

        return forkJoin({
            totalActive: totalActive$,
            gradeA: gradeA$,
            gradeBC: gradeBC$,
            gradeDE: gradeDE$,
            newThisMonth: newThisMonth$
        });
    }
}