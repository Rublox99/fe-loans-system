// report-filters.interface.ts
export interface ReportFilters {
    search?: string;
    customerId?: string;
    customersGrade?: string[];
    userId?: string;
    loanState?: string;
    feeState?: string;
    dateRange?: [Date, Date] | null;
    page?: number;
    pageSize?: number;
}