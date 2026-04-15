import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';
import { ReportCustomer } from '../../interfaces/report-customers.interface';
import { ReportFilters } from '../../interfaces/report-filters.interface';
import { PaymentGrade } from '../../types/payment-grade.type';
import { LoanStateAcronym } from '../../types/loan-state.type';
import { LocalUser } from '../../interfaces/users.interface';

export interface PaginatedCustomers {
    data: ReportCustomer[];
    total: number;
    totalCapital: number;
}

export interface PaginatedUsers {
    data: LocalUser[];
    total: number;
}

const LOAN_STATE_MAP: Record<string, LoanStateAcronym> = {
    'Under Review': 'IP',
    'Accepted': 'A',
    'Denied': 'R',
    'Paid': 'C'
};

const CAPITAL_RANGE_MAP: Record<string, { gte?: number; lte?: number }> = {
    'A': { lte: 99999.99 },
    'B': { gte: 100000, lte: 500000 },
    'C': { gte: 500000.01 }
};

@Injectable({ providedIn: 'root' })
export class ReportsService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabase.url,
            environment.supabase.key
        );
    }

    // ── Users ────────────────────────────────────────────────────────────────

    getUsers(
        search?: string,
        page: number = 1,
        pageSize: number = 10
    ): Observable<PaginatedUsers> {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        let query = this.supabase
            .from('users')
            .select(
                'id, role_id, username, email, last_session, last_modified, created_at',
                { count: 'exact' }
            )
            .range(start, end);

        if (search) {
            query = query.ilike('username', `%${search}%`);
        }

        return from(query).pipe(
            map(({ data, count, error }) => {
                if (error) throw error;
                return { data: data as LocalUser[], total: count ?? 0 };
            })
        );
    }

    // ── Report customers ─────────────────────────────────────────────────────

    getReportCustomers(
        filters: ReportFilters = {}
    ): Observable<PaginatedCustomers> {
        const {
            search,
            customerId,
            customersGrade,
            userId,
            capitalRange,
            loanState,
            feeState,
            dateRange,
            dateRangeTarget = 'next_payment', // default
            page = 1,
            pageSize = 10
        } = filters;

        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        let query = this.supabase
            .from('loans')
            .select(
                `
                id,
                capital,
                capital_balance,
                fee_value,
                paid_fees,
                state,
                date,
                next_expected_payment,
                customers!inner (
                    id,
                    first_name,
                    second_name,
                    last_names,
                    dni,
                    phone_numbers,
                    location,
                    payment_grade,
                    user_id
                ),
                fees (
                    id,
                    paid_amount,
                    fee_state,
                    expiration_date,
                    delay_days
                )
                `,
                { count: 'exact' }
            )
            .range(start, end);

        // ── Loan-level filters ───────────────────────────────────────────────

        if (customerId) {
            query = query.eq('customer_id', customerId);
        }

        if (loanState) {
            // Form sends DB values directly: 'Accepted', 'Under Review', etc.
            query = query.eq('state', loanState);
        }

        if (capitalRange) {
            const range = CAPITAL_RANGE_MAP[capitalRange];
            if (range?.gte !== undefined) query = query.gte('capital', range.gte);
            if (range?.lte !== undefined) query = query.lte('capital', range.lte);
        }

        // ── Date range filter ────────────────────────────────────────────────

        if (dateRange?.[0] && dateRange?.[1]) {
            const from_ = this.toStartOfDay(dateRange[0]);
            const to_ = this.toEndOfDay(dateRange[1]);

            if (dateRangeTarget === 'fee_date') {
                /*
                 * Option B: any fee whose expiration_date falls in range.
                 * Use case: historical review — "what was due in this period?"
                 */
                query = query
                    .gte('fees.expiration_date', from_)
                    .lte('fees.expiration_date', to_);
            } else {
                /*
                 * Option A (default): loans whose next expected payment
                 * falls in range.
                 * Use case: route planning — "what do I need to collect
                 * this week?"
                 */
                query = query
                    .gte('next_expected_payment', from_)
                    .lte('next_expected_payment', to_);
            }
        }

        // ── Customer-level filters (via !inner join) ─────────────────────────

        if (userId) {
            query = query.eq('customers.user_id', userId);
        }

        if (customersGrade && customersGrade.length > 0) {
            query = query.in('customers.payment_grade', customersGrade);
        }

        if (search) {
            query = query.or(
                `first_name.ilike.%${search}%,last_names.ilike.%${search}%,dni.ilike.%${search}%`,
                { referencedTable: 'customers' }
            );
        }

        // ── Execute ──────────────────────────────────────────────────────────

        return from(query).pipe(
            map(({ data, count, error }) => {
                if (error) throw error;

                let rows = data as any[];

                /*
                 * feeState: keep only loans that have at least one fee
                 * matching the requested state. Done client-side because
                 * PostgREST nested filters don't reduce parent rows for
                 * one-to-many relations unless using !inner on the fees
                 * join, which would strip all other fees from the array
                 * and break the paid-amount sum.
                 */
                if (feeState) {
                    rows = rows.filter(loan =>
                        (loan.fees as any[]).some(f => f.fee_state === feeState)
                    );
                }

                const mapped: ReportCustomer[] = rows.map(loan => {
                    const fees: any[] = loan.fees ?? [];

                    // Sum of all paid fees (fee_state === '2')
                    const paidAmount = fees
                        .filter(f => f.fee_state === '2')
                        .reduce((sum, f) => sum + (f.paid_amount ?? 0), 0);

                    /*
                     * Next fee: find the fee whose expiration_date matches
                     * next_expected_payment exactly — this is the ground
                     * truth set by the DB trigger when a fee is paid.
                     * Falls back to the earliest unpaid fee if no exact
                     * match is found (e.g. Paid loans where
                     * next_expected_payment is null).
                     */
                    const nextFee =
                        fees.find(
                            f => f.expiration_date === loan.next_expected_payment
                        ) ??
                        fees
                            .filter(f => f.fee_state !== '2')
                            .sort(
                                (a, b) =>
                                    new Date(a.expiration_date).getTime() -
                                    new Date(b.expiration_date).getTime()
                            )[0] ??
                        null;

                    return {
                        id: loan.id,
                        customer_id: loan.customers.id,
                        first_name: loan.customers.first_name,
                        second_name: loan.customers.second_name,
                        last_names: loan.customers.last_names,
                        dni: loan.customers.dni,
                        phone_numbers: loan.customers.phone_numbers ?? [],
                        location: loan.customers.location,
                        payment_grade: loan.customers.payment_grade as PaymentGrade,
                        capital: loan.capital,
                        capital_balance: loan.capital_balance,
                        fee_value: loan.fee_value,
                        paid_amount: paidAmount,
                        total_fees: fees.length,
                        paid_fees: loan.paid_fees,
                        loan_state: LOAN_STATE_MAP[loan.state],
                        loan_date: loan.date,
                        next_fee_due_date: loan.next_expected_payment ?? undefined,
                        next_fee_expiration_date: nextFee?.expiration_date ?? undefined,
                        next_fee_delay_days: nextFee?.delay_days ?? undefined,
                        next_fee_state: nextFee?.fee_state ?? undefined,
                    } satisfies ReportCustomer;
                });

                const totalCapital = mapped.reduce(
                    (sum, c) => sum + c.capital,
                    0
                );

                return {
                    data: mapped,
                    total: count ?? 0,
                    totalCapital
                };
            })
        );
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private toStartOfDay(date: Date): string {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    }

    private toEndOfDay(date: Date): string {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d.toISOString();
    }
}