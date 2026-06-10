export type StopStatus = "visited" | "current" | "upcoming";

export type MediaType = "image" | "video";

export type Photo = {
  id: string;
  postId: string;
  url: string;
  altText: string;
  displayOrder: number;
  /** "image" (default) or "video". Drives whether the feed renders <img> or <video>. */
  mediaType: MediaType;
  /** For videos: a still-frame poster URL, or null if none was captured. */
  posterUrl: string | null;
};

export type Post = {
  id: string;
  stopId: string;
  happenedAt: string; // ISO timestamp; drives chronological order + hour-bucket dividers
  title: string | null;
  body: string;
  photos: Photo[];
};

export type Stop = {
  id: string;
  title: string; // mirrors `city` for compatibility with the existing NOT NULL column
  slug: string;
  city: string;
  country: string;
  locationLabel: string; // "City, Country" — also stored on the row for back-compat
  latitude: number;
  longitude: number;
  status: StopStatus;
  arrivalDate: string | null;
  departureDate: string | null;
  teaser: string;
  isPublished: boolean;
  notificationSent: boolean;
  posts: Post[];
  /** Flattened convenience: every photo across this city's posts, ordered by post happened_at then photo display_order. */
  photos: Photo[];
};

export type StopInput = {
  /** city slug from the dropdown — drives all derived fields */
  slug: string;
  status: StopStatus;
  arrivalDate?: string | null;
  departureDate?: string | null;
  teaser: string;
};

export type PostInput = {
  id?: string;
  stopId: string;
  happenedAt: string;
  title?: string | null;
  body: string;
};
