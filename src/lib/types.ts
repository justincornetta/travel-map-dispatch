export type StopStatus = "visited" | "current" | "upcoming";

export type Photo = {
  id: string;
  stopId: string;
  url: string;
  altText: string;
  displayOrder: number;
};

export type Stop = {
  id: string;
  title: string;
  slug: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  status: StopStatus;
  arrivalDate: string | null;
  departureDate: string | null;
  displayAfter: string | null;
  teaser: string;
  body: string;
  isPublished: boolean;
  notificationSent: boolean;
  photos: Photo[];
};

export type StopInput = {
  title: string;
  slug?: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  status: StopStatus;
  arrivalDate?: string | null;
  departureDate?: string | null;
  displayAfter?: string | null;
  teaser: string;
  body: string;
  isPublished: boolean;
};
