
export type Role = 'user' | 'model';

export interface Message {
  role: Role;
  parts: { text: string }[];
}

export type Language = 'ar' | 'en';
