import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const CATEGORY_IDS = [
  'market',
  'akaryakit',
  'fatura',
  'kredi',
  'restoran',
  'saglik',
  'giyim',
  'ulasim',
  'ev',
  'eglence',
  'egitim',
  'diger',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: CategoryId;
  label: string;
  icon: IconName;
  color: string;
  /** Gemini'ye kategori seçerken yardımcı olacak açıklama */
  hint: string;
}

export const CATEGORIES: Record<CategoryId, Category> = {
  market: {
    id: 'market',
    label: 'Market',
    icon: 'cart',
    color: '#34D399',
    hint: 'supermarket, grocery, bakery, butcher, greengrocer',
  },
  akaryakit: {
    id: 'akaryakit',
    label: 'Akaryakıt',
    icon: 'car',
    color: '#F59E0B',
    hint: 'fuel station, petrol, diesel, LPG, car wash',
  },
  fatura: {
    id: 'fatura',
    label: 'Faturalar',
    icon: 'flash',
    color: '#60A5FA',
    hint: 'electricity, water, natural gas, phone, internet, TV subscriptions',
  },
  kredi: {
    id: 'kredi',
    label: 'Kredi / Borç',
    icon: 'card',
    color: '#F87171',
    hint: 'loan installment, credit card payment, debt',
  },
  restoran: {
    id: 'restoran',
    label: 'Yeme-İçme',
    icon: 'restaurant',
    color: '#FB923C',
    hint: 'restaurant, cafe, fast food, food delivery',
  },
  saglik: {
    id: 'saglik',
    label: 'Sağlık',
    icon: 'medkit',
    color: '#F472B6',
    hint: 'pharmacy, hospital, doctor, dentist, optician',
  },
  giyim: {
    id: 'giyim',
    label: 'Giyim',
    icon: 'shirt',
    color: '#A78BFA',
    hint: 'clothing, shoes, accessories',
  },
  ulasim: {
    id: 'ulasim',
    label: 'Ulaşım',
    icon: 'bus',
    color: '#22D3EE',
    hint: 'public transport, taxi, parking, tolls, flights, car service',
  },
  ev: {
    id: 'ev',
    label: 'Ev / Kira',
    icon: 'home',
    color: '#FACC15',
    hint: 'rent, dues, furniture, home appliances, hardware store, cleaning',
  },
  eglence: {
    id: 'eglence',
    label: 'Eğlence',
    icon: 'game-controller',
    color: '#C084FC',
    hint: 'cinema, concerts, games, hobbies, travel',
  },
  egitim: {
    id: 'egitim',
    label: 'Eğitim',
    icon: 'school',
    color: '#2DD4BF',
    hint: 'school, courses, books, stationery',
  },
  diger: {
    id: 'diger',
    label: 'Diğer',
    icon: 'ellipsis-horizontal',
    color: '#94A3B8',
    hint: 'anything else',
  },
};

export const CATEGORY_LIST: Category[] = CATEGORY_IDS.map((id) => CATEGORIES[id]);

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
}

export function getCategory(id: string | undefined): Category {
  return isCategoryId(id) ? CATEGORIES[id] : CATEGORIES.diger;
}
