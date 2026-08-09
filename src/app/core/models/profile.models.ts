export interface UserProfile {
  displayName: string;
  photoDataUrl: string | null;
  updatedAt: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: '',
  photoDataUrl: null,
  updatedAt: '',
};
