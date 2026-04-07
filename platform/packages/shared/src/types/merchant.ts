import { MerchantGroup } from '../enums/merchantGroup';

/** Operating hours for a single day. null = closed. */
export interface DayHours {
  open: string;   // 'HH:MM'
  close: string;  // 'HH:MM'
}

export type WeeklyHours = {
  mon: DayHours | null;
  tue: DayHours | null;
  wed: DayHours | null;
  thu: DayHours | null;
  fri: DayHours | null;
  sat: DayHours | null;
  sun: DayHours | null;
};

/** Per-merchant overrideable settings (ops can adjust per-merchant). */
export interface MerchantSettings {
  commissionRate: number;             // 0–1 fraction
  minOrderValueEur: number;
  deliveryFeeUnderThresholdEur: number;
  deliveryFeeOverThresholdEur: number;
  freeDeliveryThresholdEur: number;
  prepTimeEstimateMin: number;
  operatingHours: WeeklyHours;
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  group: MerchantGroup;
  status: 'active' | 'inactive' | 'suspended';
  lat: number;
  lng: number;
  address: string;
  s3LogoKey: string | null;
  settings: MerchantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantUser {
  id: string;
  merchantId: string;
  email: string;
  role: 'owner' | 'staff' | 'view_only';
  createdAt: string;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string | null;
  category: string;
  priceEur: number;
  s3ImageKey: string | null;
  isAvailable: boolean;
  isArchived: boolean;
  dietaryFlags: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
  };
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductModifier {
  id: string;
  productId: string;
  name: string;
  priceDeltaEur: number;    // can be negative (discount)
  isRequired: boolean;
  maxSelect: number;
  sortOrder: number;
}
