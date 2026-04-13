import { PaymentGrade } from "../types/payment-grade.type";

export interface GuaranteePerson {
    id: string;
    user_id: string;
    first_name: string;
    second_name: string;
    last_names: string;
    dni: string;
    email: string;
    location: string;
    profession: string;
    company?: string | null;
    gallery: string[];
    income: number;
    phone_number: string;
    comment?: string | null;
    last_modified: string;
    created_at: string;
    payment_grade?: string | null;
}

export interface InsertGuaranteePersonPayload {
    userId: string;
    firstName: string;
    secondName: string;
    lastName: string;
    dni: string;
    email: string;
    phone: string;
    location: string;
    profession: string;
    company?: string;
    income: number;
    paymentGrade: PaymentGrade;
    gallery: string[];   // normalized filenames already uploaded to storage
    notes?: string;
}

export interface UpdateGuaranteePersonPayload {
    firstName: string;
    secondName: string;
    lastName: string;
    dni: string;
    phone: string;
    email: string;
    location: string;
    profession: string;
    company?: string | null;
    income: number;
    paymentGrade: string;
    gallery: string[];
    notes?: string | null;
}

// GuaranteePersonForEdit is just the flat entity — no wrapper needed
export type GuaranteePersonForEdit = GuaranteePerson;