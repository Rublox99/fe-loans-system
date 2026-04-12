import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LOANS_MOCK } from '../../../shared/mocks/loans.mock';
import { LoanState } from '../../types/loan-state.type';
import { Loan } from '../../interfaces/loans.interface';

export interface PaginatedLoans {
    data: Loan[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class LoansService {

    getLoans(
        search?: string,
        page: number = 1,
        pageSize: number = 10,
        state?: LoanState
    ): Observable<PaginatedLoans> {
        let filtered = LOANS_MOCK;

        // Filter by state if provided
        if (state) {
            filtered = filtered.filter(l => l.state === state);
        }

        // Filter by customer_id (search)
        if (search) {
            filtered = filtered.filter(l =>
                l.customer_id.toLowerCase().includes(search.toLowerCase())
            );
        }

        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const data = filtered.slice(start, start + pageSize);

        return of({ data, total });
    }

    getLoanById(id: string): Observable<Loan | undefined> {
        return of(LOANS_MOCK.find(l => l.id === id));
    }

    getLoansByCustomerId(customerId: string): Observable<Loan[]> {
        return of(LOANS_MOCK.filter(l => l.customer_id === customerId));
    }

    getLoansByState(state: LoanState): Observable<Loan[]> {
        return of(LOANS_MOCK.filter(l => l.state === state));
    }
}