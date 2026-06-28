export type ServiceForm = {
  id?: string;
  barber?: number | null;
  catalog_service?: string;
  name: string;
  image_url?: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
};

export type PendingCatalogService = {
  catalog_service: string;
  price: string;
  is_active: boolean;
};

export type CatalogServiceOption = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  duration_minutes: number;
  category_ids: number[];
  category_names: string[];
  sort_order: number;
  index: number;
};

export type Recommendation = {
  kind: string;
  title: string;
  description: string;
  action_label: string;
  service_id?: number;
  suggested_price?: string;
  suggested_duration_minutes?: number;
  suggested_service?: {
    name: string;
    price: string;
    duration_minutes: number;
  };
};

export type ServicesLayoutId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
