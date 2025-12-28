// types/forms.ts

export interface FormFieldConfig {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "select"
    | "file"
    | "textarea"
    | "time"
    | "date";
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: unknown; // Zod schema
  helpText?: string;
  disabled?: boolean;
}

export interface FieldProps {
  name: string;
  value: unknown;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  onBlur: () => void;
  error?: string;
  isInvalid: boolean;
  disabled?: boolean;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  touched: Record<string, boolean>;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface StudentImportData {
  student_number: string;
  surname?: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone_number?: string;
}

export interface StudentImportResult {
  success: boolean;
  imported: number;
  failed: number;
  students?: import("./database").Student[];
  errors?: string[];
  warnings?: string[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value: string;
}
