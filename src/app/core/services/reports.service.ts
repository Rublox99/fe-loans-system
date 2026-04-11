import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { ReportCustomer } from '../interfaces/report-customers.interface';
import { ReportFilters } from '../interfaces/report-filters.interface';
import { PaymentGrade } from '../types/payment-grade.type';
import { LoanStateAcronym } from '../types/loan-state.type';
import { LocalUser } from '../interfaces/users.interface';

export interface PaginatedCustomers {
    data: ReportCustomer[];
    total: number;
    totalCapital: number;
}

export interface PaginatedUsers {
    data: LocalUser[];
    total: number;
}

// Maps DB loan states to acronyms
const LOAN_STATE_MAP: Record<string, string> = {
    'Under Review': 'IP',
    'Accepted': 'A',
    'Denied': 'R',
    'Paid': 'C'
};

// Maps acronyms back to DB loan states for filtering
const LOAN_STATE_REVERSE_MAP: Record<string, string> = {
    'IP': 'Under Review',
    'A': 'Accepted',
    'R': 'Denied',
    'C': 'Paid'
};

@Injectable({
    providedIn: 'root'
})
export class ReportsService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabase.url,
            environment.supabase.key
        );
    }

    getUsers(search?: string, page: number = 1, pageSize: number = 10): Observable<PaginatedUsers> {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        // 👇 Explicitly exclude password from the query
        let query = this.supabase
            .from('users')
            .select('id, role_id, username, email, last_session, last_modified, created_at', { count: 'exact' })
            .range(start, end);

        if (search) {
            query = query.ilike('username', `%${search}%`);
        }

        return from(query).pipe(
            map(({ data, count, error }) => {
                if (error) throw error;

                return {
                    data: data as LocalUser[],
                    total: count ?? 0
                };
            })
        );
    }

    getUserById(id: string): Observable<LocalUser | undefined> {
        return from(
            this.supabase
                .from('users')
                .select('id, role_id, username, email, last_session, last_modified, created_at')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;

                return data as LocalUser;
            })
        );
    }

    getReportCustomers(filters: ReportFilters = {}): Observable<PaginatedCustomers> {
        const {
            search,
            customerId,
            customersGrade,
            userId,
            loanState,
            feeState,
            dateRange,
            page = 1,
            pageSize = 10
        } = filters;

        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        // Base query joining loans → customers, aggregating paid fees
        let query = this.supabase
            .from('loans')
            .select(`
                id,
                capital,
                state,
                first_expiration_date,
                next_expected_payment,
                customers!inner (
                    first_name,
                    second_name,
                    last_names,
                    dni,
                    payment_grade,
                    user_id
                ),
                fees (
                    paid_amount,
                    fee_state
                )
            `, { count: 'exact' })
            .range(start, end);

        if (customerId) {
            query = query.eq('customer_id', customerId);
        }

        if (userId) {
            query = query.eq('customers.user_id', userId);
        }

        if (customersGrade && customersGrade.length > 0) {
            query = query.in('customers.payment_grade', customersGrade);
        }

        if (loanState) {
            const dbState = LOAN_STATE_REVERSE_MAP[loanState];
            if (dbState) query = query.eq('state', dbState);
        }

        if (feeState) {
            // Filter loans that have at least one fee matching the state
            query = query.eq('fees.fee_state', feeState);
        }

        if (dateRange?.[0] && dateRange?.[1]) {
            query = query
                .gte('next_expected_payment', dateRange[0].toISOString())
                .lte('next_expected_payment', dateRange[1].toISOString());
        }

        if (search) {
            query = query.or(
                `first_name.ilike.%${search}%,last_names.ilike.%${search}%`,
                { referencedTable: 'customers' }
            );
        }

        return from(query).pipe(
            map(({ data, count, error }) => {
                if (error) throw error;

                const mapped: ReportCustomer[] = (data as any[]).map(loan => {
                    // Sum only fees where fee_state = '2' (Paid)
                    const paidAmount = (loan.fees as any[])
                        .filter(f => f.fee_state === '2')
                        .reduce((sum: number, f: any) => sum + (f.paid_amount ?? 0), 0);

                    return {
                        id: loan.id,
                        first_name: loan.customers.first_name,
                        second_name: loan.customers.second_name,
                        last_names: loan.customers.last_names,
                        dni: loan.customers.dni,
                        payment_grade: loan.customers.payment_grade as PaymentGrade,
                        capital: loan.capital,
                        paid_amount: paidAmount,
                        loan_state: LOAN_STATE_MAP[loan.state] as LoanStateAcronym,
                        date_of_approval: loan.first_expiration_date ?? undefined,
                        next_fee_due_date: loan.next_expected_payment ?? undefined
                    };
                });

                const totalCapital = mapped.reduce((sum, c) => sum + c.capital, 0);

                return {
                    data: mapped,
                    total: count ?? 0,
                    totalCapital
                };
            })
        );
    }
}