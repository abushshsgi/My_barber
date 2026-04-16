"use client";

export type SalonMineRow = {
  id: number;
  name: string;
  address?: string;
  cover_image?: string | null;
  rating_avg?: number;
  review_count?: number;
};

export type SalonImageRow = { id: number; image: string; sort_order: number };

export type BarberSalonViewDetail = {
  id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  cover_image: string | null;
  images: SalonImageRow[];
  rating_avg: number;
  review_count: number;
};

export type ApiReview = {
  id: number;
  author_name: string;
  rating: number;
  text: string;
  photo: string | null;
  created_at: string;
};

