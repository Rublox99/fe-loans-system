export interface GuaranteePerson {
    id: string;                  // uuid
    user_id: string;             // uuid, FK → users
    first_name: string;
    second_name: string;
    last_names: string;
    dni: string;                 // exactly 13 numeric characters
    email: string;
    location: string;
    profession: string;
    company: string | null;
    gallery: string[];
    income: number;              // numeric(14, 2)
    phone_number: string;
    comment: string | null;
    last_modified: string;       // ISO date
    created_at: string;          // ISO date
}