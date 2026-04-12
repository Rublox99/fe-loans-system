import { CustomerState } from "../types/customer-state.type";
import { PaymentGrade } from "../types/payment-grade.type";
import { SpouseSummary } from "./spouse-summary.interface";

export interface Customer {
    id: string;
    first_name: string;
    second_name: string;
    last_names: string;
    dni: string;
    email: string;
    phone_numbers: string[];
    location: string;
    profession: string;
    income: number;
    spouse_id?: string | null;
    spouse?: SpouseSummary | null;        // joined field
    guaranteePerson_id?: string | null;
    gallery: string[];
    payment_grade: PaymentGrade;
    last_modified: string;
    created_at: string;
    user_id: string;
    state: CustomerState;
    company?: string | null;
    comment?: string | null;
}