export interface Spouse {
    id: string;
    first_name: string;
    second_name: string;
    last_names: string;
    dni: string;
    phone_numbers: string[];
    location: string;
    profession: string;
    income: number;
    last_modified: string;
    created_at: string;
}

export interface InsertSpousePayload {
  firstName:   string;
  secondName:  string;
  lastName:    string;
  dni:         string;   
  phone:       string;   
  location:    string;
  profession:  string;
  income:      number;
}