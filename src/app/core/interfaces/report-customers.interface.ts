import { LoanState } from "../types/loan-state.type";
import { PaymentGrade } from "../types/payment-grade.type";

export interface ReportCustomer {
    id: string; // uuid
    first_name: string;
    second_name: string;
    last_names: string;
    dni: string; // 13 chars
    payment_grade: PaymentGrade;
    capital: number;
    paid_amount: number; // Fees total currency paid by the customer
    loan_state: LoanState;
    date_of_approval?: string; // ISO date, only for approved loans
    next_fee_due_date?: string; // ISO date, only for approved loans
}