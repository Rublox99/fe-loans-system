import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { FEES_MOCK } from '../../../shared/mocks/fees.mock';
import { Fee } from '../../interfaces/fees.interface';
import { FeeState } from '../../types/fee-state';

export interface PaginatedFees {
    data: Fee[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class FeesService {

    getFees(
        page: number = 1,
        pageSize: number = 10,
        state?: FeeState
    ): Observable<PaginatedFees> {
        let filtered = FEES_MOCK;

        // Filter by fee_state if provided
        if (state) {
            filtered = filtered.filter(f => f.fee_state === state);
        }

        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        return of({ data, total });
    }

    getFeeById(id: string): Observable<Fee | undefined> {
        return of(FEES_MOCK.find(f => f.id === id));
    }

    getFeesByLoanId(
        loanId: string,
        text: string,
        page: number = 1,
        pageSize: number = 10,
        state?: FeeState
    ): Observable<PaginatedFees> {
        let filtered = FEES_MOCK.filter(f => f.loan_id === loanId);

        if (state) {
            filtered = filtered.filter(f => f.fee_state === state);
        }

        if (text) {
            filtered = filtered.filter(f => f.id.includes(text));
        }

        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        return of({ data, total });
    }

    getFeesByState(state: FeeState): Observable<Fee[]> {
        return of(FEES_MOCK.filter(f => f.fee_state === state));
    }
}