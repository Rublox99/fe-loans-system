import { LoanStateAcronym } from "../types/loan-state.type";
import { PaymentGrade } from "../types/payment-grade.type";

export interface ReportCustomer {
    id: string;                      // loan id
    customer_id: string;
    first_name: string;
    second_name: string;
    last_names: string;
    dni: string;
    phone_numbers: string[];
    location: string;
    payment_grade: PaymentGrade;

    // Loan data
    capital: number;
    capital_balance: number;         // remaining debt
    fee_value: number;               // expected amount per fee
    paid_amount: number;             // sum of paid fees
    total_fees: number;
    paid_fees: number;
    loan_state: LoanStateAcronym;
    loan_date: string;               // loan creation date

    // Next pending fee data (within date range if filtered)
    next_fee_due_date?: string;      // next_expected_payment from loan
    next_fee_expiration_date?: string; // expiration_date from the fee record
    next_fee_delay_days?: number;    // delay_days from the fee record
    next_fee_state?: string;         // '1' | '2' | '3'
}