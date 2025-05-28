import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Toast } from "@/utils/toast";
import { AppEnv } from "@/config/AppEnv";

const ENABLE_LOG = !false;
axios.interceptors.request.use(
  async (config) => {
    try {
      // Retrieve token from AsyncStorage
      const token = await AsyncStorage.getItem("token");

      if (token) {
        if (!config.headers?.Authorization) {
          config.headers.Authorization = `Token ${token}`;
        }
      }
      if (ENABLE_LOG) {
        console.log(
          [
            `${config.method} ${config.baseURL}${config.url}`,
            `Authorization: ${config.headers?.Authorization}`,
            JSON.stringify(config.data, null, 2),
          ]
            .filter(Boolean)
            .join("\n")
        );
      }
    } catch (error) {
      console.error("Error in request interceptor:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // const errorMessage =
    //   (error.response?.data as any)?.detail ||
    //   (error.response?.data as any)?.message;

    if (error.response?.status === 401) {
      Toast.show(
        "Login expired. Please Login again!",
        Toast.SHORT,
        "top",
        "error"
      );
      // Optionally clear token from AsyncStorage here
      AsyncStorage.removeItem("token");
      AsyncStorage.removeItem("username");
      router.push("/auth");
    }
    console.log("response", error);
    if (error.response?.status === 500) {
      Toast.show("API error. please try later", Toast.SHORT);
    }

    if (error.response?.status === 503) {
      Toast.show("Service unavailable. please try later.", Toast.SHORT);
    }

    // Custom error formatting
    const formattedError = {
      message: error.response?.data || "An error occurred",
      status: error.response?.status || 500,
    };

    return Promise.reject(formattedError);
  }
);

export const axiosApi = <
  Url extends keyof AllApiEndpoints,
  T extends AllApiEndpoints[Url]["request"]
>({
  method,
  params,
  url,
  ...config
}: {
  url: Url;
  method: AllApiEndpoints[Url]["request"]["method"];
} & Omit<Omit<Omit<AxiosRequestConfig, "url">, "method">, "data"> & {
    [K in keyof T]-?: T[K];
  }): Promise<AxiosResponse<AllApiEndpoints[Url]["response"]>> => {
  return axios({
    url: url,
    method: method,
    params,
    baseURL: AppEnv.apiUrl,
    ...config,
  });
};


export interface MeetingWithBot {
  meeting_url: string;
  category_id?: number ;
  user_id: number;
  meeting_title?: string;
}

interface CategoryWithMeetingsBase {
  category_id: number;
  category: {
    name: string;
    is_default: boolean;
    user: number;
  };
  meetings: {
    id: number;
    event_id: string;
    meet_url: string;
    video_url: string | null;
    meeting_title: string;
    meeting_date: string;
    meeting_start_time: string;
    meeting_end_time: string;
    organizer_email: string;
    source: string;
    meeting_code: string | null;
    meeting_admin_id: number;
    categoryId: number;
    bot_id: string;
  }[];
}


export interface CategoryWithMeetings {
  category_id: number;
  category: {
    name: string;
  is_default: boolean;
  user: number;
  }
  meetings: {
    id: number;
    event_id: string;
    meet_url: string;
    meeting_title: string;
    meeting_date: string;
    meeting_start_time: string;
    meeting_end_time: string;
    organizer_email: string;
    source: string;
    meeting_code: string | null;
    meeting_admin_id: number;
    categoryId: number;
    bot_id: number;
  }[];
  total_meetings: number;
  index: number;
}

interface AllApiEndpoints {
  "/login/": {
    request: {
      method: "POST";
      params?: undefined;
      data: {
        email: string;
        password: string;
      };
    };
    response: {
      token: string;
      user_id: number;
      email: string;
      first_name: string;
      chrome_token: string;
      is_calls_scheduled: boolean | null;
    };
  };
  "/register/": {
    request: {
      method: "POST";
      params: {
        platform: string;
      };
      data: {
        email: string;
        password: string;
        password2: string;
        first_name: string;
      };
    };
    response: {
      message: string;
    };
  };
  "/validate-token/": {
    request: {
      method: "POST";
      params?: undefined;
      data: {
        otp: string;
      };
    };
    response: {
      error: boolean;
      message: string;
    };
  };
  "/resend-confirmation/": {
    request: {
      method: "POST";
      params: {
        platform: string;
      };
      data: {
        email: string;
      };
    };
    response: {
      message: string;
    };
  };
  "/forgot-password/": {
    request: {
      method: "POST";
      params?: undefined;
      data: {
        email: string;
      };
    };
    response: {
      message: string;
    };
  };
  "/reset-password/{{uid}}/{{token}}/": {
    request: {
      method: "POST";
      params?: undefined;
      data: {
        new_password: string;
        confirm_password: string;
      };
    };
    response: {
      message: string;
    };
  };
  "/google-auth/": {
    request: {
      method: "POST";
      params: {
        no_redirect_uri: number;
      };
      data: {
        code: string;
      };
    };
    response: {
      token: string;
      user_id: number;
      email: string;
      first_name: string;
      chrome_token: string;
      is_calls_scheduled: boolean | null;
      is_google_calendar_permission_given: boolean;
      profile_pic: string | null;
    };
  };
  "/apple-auth/": {
    request: {
      method: "POST";
      params?: undefined;
      data: {
        authorization_code: string;
        username: string | null;
      };
    };
    response: {
      token: string;
      user_id: number;
      email: string;
      first_name: string;
      chrome_token: string;
    };
  };
  "/generate-presigned-url/": {
    request: {
      method: "POST";
      params: {
        only_pre_signed_url: number;
      };
      data?: undefined;
    };
    response: {
      success: boolean;
      message: string;
      data: {
        url: string;
        file_path: string;
      };
    };
  };
  "/process-audio/": {
    request: {
      method: "POST";
      params?: undefined;
      data: ProccessAudio;
    };
    response: {
      success: boolean;
      message: string;
      data: {
        event_id: string;
      };
    };
  };
  "/list-meetings/": {
    request: {
      method: "GET";
      params?: {
        title_query?: string;
        page_size?: number;
        transcription_status?: "success" | "failed";
        start_time?: string;
        from_date?: string;
        to_date?: string;
      };
      data?: undefined;
    };
    response: MeetingListResponse;
  };

  // Add to your AllApiEndpoints interface in api/api.ts:

  "/categories-with-meetings/": {
    request: {
      method: "GET";
      params: {
        num_meetings?: number;
        category_id?: string;
        offsets?: number;
      };
      data?: undefined;
    };
    response: {
      data: CategoryWithMeetings[];
    };
  },
  "/uncategorized-meetings/": {
    request: {
      method: "GET";
      params: {
        num_meetings?: number;
        offsets?: number;
      };
      data?: undefined;
    };
    response: {
      data: CategoryWithMeetings[];
    };
  },

    "/onboarding/": {
    request: {
      method: "POST";
      params?: undefined;
      data: {
        referred_from: string;
        use_case: string;
        user_type: string;
      };
    };
    response: {
      success: boolean;
      message: string;
    };
  };
  "/user-details/": {
    request: {
      method: "GET";
      params?: undefined;
      data?: undefined;
    };
    response: {
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
    };
  };
  "/update-user-details/": {
    request: {
      method: "PUT";
      params?: undefined;
      data: {
        user: {
          first_name: string;
          last_name: string;
        };
        profile: {
          referred_from: string;
          use_case: string;
          user_type: string;
        };
      };
    };
    response: {
      success: boolean;
      message: string;
    };
  };
  "/sync-google-calendar/": {
    request: {
      method: "POST";
      params?: undefined;
      data?: undefined;
    };
    response: {
      success: boolean;
      message: string;
    };
  };
  "/disconnect-google-calendar/": {
    request: {
      method: "POST";
      params?: undefined;
      data?: undefined;
    };
    response: {
      success: boolean;
      message: string;
    };
  };

    "/meetings/create-meeting-with-bot/": {
    request: {
      method: "POST";
      params?: undefined;
      data: MeetingWithBot;
    };
    response: {
      id: string;
      meeting_url: {
        meeting_id: string;
        platform: string;
      };
      bot_name: string;
      join_at: string;
      status_text: string;
    };
  };
  
  "/meetings/bot/status/{{bot_id}}/": {
    request: {
      method: "GET";
      params?: undefined; 
      data?: undefined;
    };
    response: {
      id: string;
      meeting_url: {
        meeting_id: string;
        platform: string;
      };
      bot_name: string;
      join_at: string;
      status_text: string;
    };
  };
  
  "/meetings/{{meetingId}}/": {
    request: {
      method: "PATCH";
      params?: undefined;
      data: {
        categoryId: number;
      };
    };
    response: {
      success: boolean;
      message: string;
      data: {
        id: number;
        event_id: string;
        meet_url: string;
        video_url: string | null;
        meeting_title: string;
        meeting_date: string;
        meeting_start_time: string;
        meeting_end_time: string;
        organizer_email: string;
        source: string;
        meeting_code: string | null;
        meeting_admin_id: number;
        categoryId: number;
        bot_id: string;
      };
    };
  };
  
  "/meetings/search": {
    request: {
      method: "GET";
      params: {
        num_meetings?: number;
        query?: string;
        offsets?: number;
        category_id?: number;
      };
      data?: undefined;
    };
    response: {
      data: CategoryWithMeetings[];
    };
  };

  "/meeting-view/{{eventId}}/": {
    request: {
      method: "GET";
      params?: undefined;
      data?: undefined;
    };
    response: MeetingViewResponse;
  };
  "/make-public/{{meeting_event_id}}/": {
    request: {
      method: "POST";
      params?: undefined;
      data?: undefined;
    };
    response: {
      success: boolean;
      message: string;
    };
  };
  "/feedback/create-feedback/": {
    request: {
      method: "POST";
      params?: undefined;
      data: FeedbackPayload;
    };
    response: {
      success: boolean;
      message: string;
    };
  };
  "/chat/chat-history/{{eventId}}/": {
    request: {
      method: "GET";
      params?: undefined;
      data?: undefined;
    };
    response: {
      success: boolean;
      message: string;
      data: Chat[];
    };
  };
  "/chat/": {
    request: {
      method: "POST";
      params?: undefined;
      data: {
        user_input: string;
        event_id: string;
      };
    };
    response: {
      data: Chat[];
    };
  };
  "/download-meeting-report/{{meeting_event_id}}/": {
    request: {
      method: "GET";
      params?: undefined;
      data?: undefined;
    };
    response: any;
  };
  "/meeting-transcription-details/{{meeting_id}}/": {
    request: {
      method: "GET";
      params?: undefined;
      data?: undefined;
    };
    response: {
      success: boolean;
      message: string;
      data: {
        meeting_mp3: string;
        transcript: string;
      };
    };
  };
  "/subscriptions/subscription-status/": {
    request: {
      method: "GET";
      params?: undefined;
      data?: undefined;
    };
    response: {
      message: string;
      success: string;
      data: {
        is_trial: boolean;
        trial_days_left: number;
        is_subscribed: boolean;
        plan: string;
        features: {
          chat: boolean;
          itegrations: boolean;
          consolidation: boolean;
          download_report: boolean;
          email_notification: boolean;
        };
        subscription_status: SubscriptionStatus;
        subscription_end_date: string;
      };
    };
  };
}

interface MeetingListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: {
    user: string;
    meetings: MeetingData[];
  };
}

export interface MeetingData {
  id: number;
  meet_url: string;
  meeting_title: string;
  meeting_date: string;
  meeting_start_time: string;
  meeting_end_time: string;
  organizer_email: string;
  source: string;
  event_id: string;
}

export interface ProccessAudio {
  file_url: string;
  file_path: string;
  meeting_title: string;
}

export interface MeetingViewResponse {
  is_public: boolean;
  participants: Participants[];
  summary: string;
  subject: string;
  meeting_purpose: string;
  key_takeaways: KeyTakeAways[] | null;
  action_points: ActionPoints[] | null;
  topics: Topics[] | null;
  meeting_status: MeetingStatus;
  other_points: Others[] | null;
  questions: SuggestedMessage[];
  error_message: string | null;
  trascription_status: string;
}
export interface Participants {
  name: string;
  image: string | null;
}

export interface KeyTakeAways {
  id: number;
  item_text: string;
}

export interface ActionPoints {
  id: number;
  item_type: string;
  item_text: string;
  speaker: string;
  description: string | null;
  meeting: number;
}

export interface Topics {
  id: number;
  item_type: string;
  item_text: string;
  description: string;
  speaker: string;
}

export interface Others {
  id: number;
  item_text: string;
}

interface MeetingStatus {
  recording?: boolean;
  transcription?: boolean;
  summary?: string;
}

export interface SuggestedMessage {
  item_text: string;
}

export interface FeedbackPayload {
  event_id: string;
  rating: number;
  message: string;
}

export interface Chat {
  id: number;
  user_type: "user" | "ai";
  message: string;
  user: number;
  timestamp: string;
}

export type SubscriptionStatus =
  | "trial"
  | "no_subscription"
  | "active"
  | "expired"
  | "canceled"
  | "inactive";
