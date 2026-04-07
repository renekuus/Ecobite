export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;              // 'home' | 'work' | 'other' | custom
  street: string;
  city: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  email: string;
  phone: string;
  name: string;
  status: 'active' | 'suspended' | 'deleted';
  stripeCustomerId: string | null;
  locale: string;
  createdAt: string;          // ISO 8601
  updatedAt: string;
}
