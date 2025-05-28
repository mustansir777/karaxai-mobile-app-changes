import { axiosApi } from "./api";

export interface OnboardingData {
  referred_from: string;
  use_case: string;
  user_type: string;
}

export interface UserDetailsResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      username: string;
      is_active: boolean;
      date_joined: string;
      last_login: string | null;
    };
    profile: {
      is_trial_active: boolean;
      trial_end_date: string;
      is_deleted: boolean;
      deleted_at: string | null;
      referred_from: string;
      use_case: string;
      user_type: string;
    };
  };
}

export interface UpdateUserDetailsPayload {
  user: {
    first_name: string;
    last_name: string;
  };
  profile: {
    referred_from: string;
    use_case: string;
    user_type: string;
  };
}

export interface SimpleResponse {
  success: boolean;
  message: string;
}

// Submit onboarding data
export const submitOnboarding = async (data: OnboardingData): Promise<SimpleResponse> => {
  try {
    const response = await axiosApi({
      url: "/onboarding/",
      method: "POST",
      data,
    });
    return response.data;
  } catch (error) {
    console.error("Error submitting onboarding data:", error);
    throw error;
  }
};

// Get user details
export const getUserDetails = async (): Promise<UserDetailsResponse> => {
  try {
    const response = await axiosApi({
      url: "/user-details/",
      method: "GET",
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching user details:", error);
    throw error;
  }
};

// Update user details
export const updateUserDetails = async (
  data: UpdateUserDetailsPayload
): Promise<SimpleResponse> => {
  try {
    const response = await axiosApi({
      url: "/update-user-details/",
      method: "PUT",
      data,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating user details:", error);
    throw error;
  }
};

// Sync Google Calendar
export const syncGoogleCalendar = async (): Promise<SimpleResponse> => {
  try {
    const response = await axiosApi({
      url: "/sync-google-calendar/",
      method: "POST",
    });
    return response.data;
  } catch (error) {
    console.error("Error syncing Google Calendar:", error);
    throw error;
  }
};

// Disconnect Google Calendar
export const disconnectGoogleCalendar = async (): Promise<SimpleResponse> => {
  try {
    const response = await axiosApi({
      url: "/disconnect-google-calendar/",
      method: "POST",
    });
    return response.data;
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    throw error;
  }
};
