export interface LocalUser {
    id: string; // uuid
    role_id: string; // uuid
    username: string;
    email: string;
    password?: never;
    last_session?: string | null;
    last_modified: string;
    created_at: string;
}