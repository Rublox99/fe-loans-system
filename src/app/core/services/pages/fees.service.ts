import { Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { Fee, UpdateFeePayload } from '../../interfaces/fees.interface';
import { FeeState } from '../../types/fee-state';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';

export interface PaginatedFees {
    data: Fee[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class FeesService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabase.url,
            environment.supabase.key
        );
    }

    // ─── SELECT ────────────────────────────────────────────────────────────────

    getFeesByLoanId(
        loanId: string,
        search?: string,
        page: number = 1,
        pageSize: number = 10,
        state?: FeeState
    ): Observable<PaginatedFees> {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        let query = this.supabase
            .from('fees')
            .select('*', { count: 'exact' })
            .eq('loan_id', loanId)
            .range(start, end)
            .order('expiration_date', { ascending: true }); // natural chronological order

        if (state) {
            query = query.eq('fee_state', state);
        }

        if (search?.trim()) {
            query = query.ilike('id', `%${search.trim()}%`);
        }

        return from(query).pipe(
            map(({ data, count, error }) => {
                if (error) throw error;
                return {
                    data: data as Fee[],
                    total: count ?? 0
                };
            })
        );
    }

    getFeeById(id: string): Observable<Fee | undefined> {
        return from(
            this.supabase
                .from('fees')
                .select('*')
                .eq('id', id)
                .single()
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as Fee;
            })
        );
    }

    getFees(
        page: number = 1,
        pageSize: number = 10,
        state?: FeeState
    ): Observable<PaginatedFees> {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        let query = this.supabase
            .from('fees')
            .select('*', { count: 'exact' })
            .range(start, end);

        if (state) {
            query = query.eq('fee_state', state);
        }

        return from(query).pipe(
            map(({ data, count, error }) => {
                if (error) throw error;
                return {
                    data: data as Fee[],
                    total: count ?? 0
                };
            })
        );
    }

    getFeesByState(state: FeeState): Observable<Fee[]> {
        return from(
            this.supabase
                .from('fees')
                .select('*')
                .eq('fee_state', state)
        ).pipe(
            map(({ data, error }) => {
                if (error) throw error;
                return data as Fee[];
            })
        );
    }

    // ─── UPDATE ────────────────────────────────────────────────────────────────

    updateFee(id: string, payload: UpdateFeePayload): Observable<void> {
        return from(
            this.supabase
                .from('fees')
                .update(payload)
                .eq('id', id)
        ).pipe(
            map(({ error }) => {
                if (error) throw error;
            })
        );
    }

    payFeeEarly(feeId: string, paymentDate?: string): Observable<void> {
        return from(
            this.supabase.rpc('fn_pay_fee_early', {
                p_fee_id: feeId,
                p_payment_date: paymentDate ?? new Date().toISOString()
            })
        ).pipe(
            map(({ error }) => {
                if (error) throw error;
            })
        );
    }
}