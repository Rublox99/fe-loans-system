// report-filters.interface.ts
export interface ReportFilters {
    search?: string;
    customerId?: string;
    customersGrade?: string[];
    userId?: string;
    capitalRange?: 'A' | 'B' | 'C';
    loanState?: string;
    feeState?: string;
    dateRange?: [Date, Date] | null;
    dateRangeTarget?: 'next_payment' | 'fee_date';
    page?: number;
    pageSize?: number;
}