import { CustomerState } from "../types/customer-state.type";
import { PaymentGrade } from "../types/payment-grade.type";

export interface Customer {
    id: string; // uuid
    first_name: string;
    second_name: string;
    last_names: string;
    dni: string; // 13 chars
    phone_numbers: string[];
    location: string;
    profession: string;
    income: number;
    spouse_id?: string | null;
    gallery: string[];
    payment_grade: PaymentGrade;
    last_modified: string; // ISO date
    created_at: string; // ISO date
    user_id: string;
    state: CustomerState;
    company?: string | null;
    comment?: string | null;
}