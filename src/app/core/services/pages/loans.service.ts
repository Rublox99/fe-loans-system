import { Injectable } from '@angular/core';
import { forkJoin, from, map, Observable, of } from 'rxjs';
import { LoanState } from '../../types/loan-state.type';
import { CreateLoanPayload, Loan, LoansStats, LoanWithCustomer, UpdateLoanPayload } from '../../interfaces/loans.interface';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { AuthService } from './auth.service';

export interface PaginatedLoans {
    data: Loan[];
    total: number;
    customerNames: Map<string, string>;  // customer_id → full name
}

@Injectable({
    providedIn: 'root'
})
export class LoansService {
    private supabase: SupabaseClient;

    constructor(
        private authService: AuthService
    ) {
        this.supabase = createClient(
            environment.supabase.url,
            environment.supabase.key
        );
    }

    // ─── SELECT ────────────────────────────────────────────────────────────────

    getLoans(
        search?: string,
        page: number = 1,
        pageSize: number = 10,
    ): Observable<PaginatedLoans> {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        let query = this.supabase
            .from('loans')
            .select(`
                *,
                customer:customers!inner(          
                    first_name,
                    second_name,
                    last_names,
                    dni
                )
            `, { count: 'exact' })
            .range(start, end);

        if (search) {
            const term = search.trim();
            query = query.or(
                `first_name.ilike.%${term}%,` +
                `second_name.ilike.%${term}%,` +
                `last_names.ilike.%${term}%,` +
                `dni.ilike.%${term}%`,
                { referencedTable: 'customers' }  // Scopes the filter to the joined table
            );
        }

        return from(query).pipe(
            map(({ data, count, error }) => {
                if (error) throw error;

                const loans = (data as LoanWithCustomer[]);

                // Build a lookup map: customer_id → full name
                const customerNames = new Map<string, string>(
                    loans.map(l => [
                        l.customer_id,
                        l.customer
                            ? [l.customer.first_name, l.customer.second_name, l.customer.last_names]
                                .filter(Boolean)
                                .join(' ')
                            : 'Unknown'
                    ])
                );

                return {
                    data: loans as Loan[],
                    total: count ?? 0,
                    customerNames
                };
            })
        );
    }

    getLoanById(id: string): Observable<Loan | undefined> {
        return from(
            this.supabase
                .from('loans')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as Loan;
            })
        );
    }

    /* TODO: Possibly required in a future */
    /* 
    getLoansByCustomerId(customerId: string): Observable<Loan[]> {
        return of(LOANS_MOCK.filter(l => l.customer_id === customerId));
    }

    getLoansByState(state: LoanState): Observable<Loan[]> {
        return of(LOANS_MOCK.filter(l => l.state === state));
    }
    */

    getLoansStats(): Observable<LoansStats> {
        const stats$ = from(
            this.supabase
                .from('loans')
                .select('capital, capital_balance')
                .eq('state', 'Accepted')
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;

                const loans = data ?? [];
                const activeLoans = loans.length;

                const totalCapital = loans.reduce((sum, l) => sum + Number(l.capital), 0);
                const totalBalance = loans.reduce((sum, l) => sum + Number(l.capital_balance), 0);

                // Capital still in circulation (not yet returned)
                const fluctuatingCapital = totalBalance;

                // Percentage of total capital that has been returned
                const portfolioLiquidity = totalCapital > 0
                    ? ((totalCapital - totalBalance) / totalCapital) * 100
                    : 0;

                return { fluctuatingCapital, portfolioLiquidity, activeLoans };
            })
        );

        return stats$;
    }

    // ─── INSERT ────────────────────────────────────────────────────────────────
    createLoan(payload: CreateLoanPayload): Observable<void> {
        const user = this.authService.currentUser;
        if (!user) throw new Error('No authenticated user');

        const insert = {
            customer_id: payload.customerId,
            raw_capital: payload.raw_capital,
            capital: payload.capital,
            capital_balance: payload.capital_balance,
            interest: payload.interest,
            fees: payload.fees,
            fee_value: payload.feeValue,
            modality: payload.modality,
            state: 'Under Review',
        };

        return from(
            this.supabase.from('loans').insert(insert)
        ).pipe(
            map(({ error }) => {
                if (error) throw error;
            })
        );
    }

    // ─── UPDATE ────────────────────────────────────────────────────────────────
    updateLoanState(loanId: string, newState: LoanState): Observable<void> {
        return from(
            this.supabase
                .from('loans')
                .update({ state: newState })
                .eq('id', loanId)
        ).pipe(
            map(({ error }) => {
                if (error) throw error;
            })
        );
    }

    updateLoan(loanId: string, payload: UpdateLoanPayload): Observable<void> {
        return from(
            this.supabase
                .from('loans')
                .update(payload)
                .eq('id', loanId)
        ).pipe(
            map(({ error }) => {
                if (error) throw error;
            })
        );
    }
}