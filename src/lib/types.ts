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
  happenedAt: string; // ISO timestamp; drives hour-bucket dividers + "Day N" labels
  createdAt: string; // ISO timestamp of when the row was created (used for "new posts since you last read")
  sortOrder: number; // manual display order within the city (admin drag / up-down)
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
  /** Chosen home-page cover photo id (admin pick), or null to use the first photo. */
  coverPhotoId: string | null;
  /** Resolved cover photo (image), or null. Drives the home postcard + share image. */
  coverPhoto: Photo | null;
};

/** Per-user reading progress for one city, computed server-side for the home timeline. */
export type CityProgress = {
  viewed: number;
  total: number;
  state: "none" | "partial" | "viewed" | "empty";
  /** True when this city is partial because new posts arrived after the user last read it. */
  isNew: boolean;
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
