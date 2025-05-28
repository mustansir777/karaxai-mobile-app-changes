import React, { useState, useEffect } from "react";
import { 
  SafeAreaView, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator 
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Toast } from "@/utils/toast";
import { axiosApi } from "@/api/api";
import useAuthStorage from "@/hooks/useAuthData";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import SelectDropdown from "react-native-select-dropdown";

// Define interfaces for the onboarding data
interface OnboardingData {
  referred_from: string;
  use_case: string;
  user_type: string;
}

interface UserDetailsResponse {
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

interface UpdateUserDetailsPayload {
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

interface SimpleResponse {
  success: boolean;
  message: string;
}

const TOTAL_STEPS = 4;

// API functions to interact with the server
const getUserDetails = async (): Promise<UserDetailsResponse> => {
  const response = await axiosApi({
    url: "/user-details/",
    method: "GET",
  });
  return response.data;
};

const submitOnboarding = async (data: OnboardingData): Promise<SimpleResponse> => {
  const response = await axiosApi({
    url: "/onboarding/",
    method: "POST",
    data,
  });
  return response.data;
};

const updateUserDetails = async (data: UpdateUserDetailsPayload): Promise<SimpleResponse> => {
  const response = await axiosApi({
    url: "/update-user-details/",
    method: "PUT",
    data,
  });
  return response.data;
};

const syncGoogleCalendar = async (): Promise<SimpleResponse> => {
  const response = await axiosApi({
    url: "/sync-google-calendar/",
    method: "POST",
  });
  return response.data;
};

const disconnectGoogleCalendar = async (): Promise<SimpleResponse> => {
  const response = await axiosApi({
    url: "/disconnect-google-calendar/",
    method: "POST",
  });
  return response.data;
};

// Referral sources for the dropdown
const referralSources = [
  "Social Media",
  "Friend or Colleague",
  "Search Engine",
  "Blog or Article",
  "Podcast",
  "Conference or Event",
  "Advertisement",
  "Email",
  "Other",
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    referred_from: "",
    use_case: "",
    user_type: "",
  });
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedUseCase, setSelectedUseCase] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  const authStorage = useAuthStorage();

  // Fetch user details only when token is available
  const { data: userDetailsData, isLoading: isLoadingUserDetails } = useQuery<UserDetailsResponse>({
    queryKey: ["userDetails"],
    queryFn: getUserDetails,
    enabled: !!authStorage.token, // Only run query when token exists
  });

  // Process user details when data is received
  useEffect(() => {
    if (userDetailsData) {
      if (userDetailsData.success) {
        setFirstName(userDetailsData.data.user.first_name);
        
        // Pre-fill form data if user has already started onboarding
        const profile = userDetailsData.data.profile;
        if (profile.referred_from || profile.use_case || profile.user_type) {
          setFormData({
            referred_from: profile.referred_from || "",
            use_case: profile.use_case || "",
            user_type: profile.user_type || "",
          });
          setSelectedSource(profile.referred_from || "");
          setSelectedUseCase(profile.use_case || "");
          setSelectedPath(profile.user_type || "");
        }
      }
      setIsLoading(false);
    }
  }, [userDetailsData]);

  // Error handling for user details
  useEffect(() => {
    if (!isLoadingUserDetails && !userDetailsData) {
      setIsLoading(false);
      Toast.show("Failed to load user details", Toast.SHORT, "bottom", "error");
    }
  }, [isLoadingUserDetails, userDetailsData]);

  // Submit onboarding data mutation
  const submitOnboardingMutation = useMutation<SimpleResponse, Error, OnboardingData>({
    mutationFn: submitOnboarding,
    onSuccess: (data) => {
      if (data.success) {
        Toast.show("Onboarding completed! Please login to continue.", Toast.SHORT);
        router.replace("/auth");
      } else {
        Toast.show(data.message || "Error completing onboarding", Toast.SHORT, "bottom", "error");
      }
    },
    onError: (error) => {
      Toast.show("Failed to complete onboarding", Toast.SHORT, "bottom", "error");
    }
  });

  // Update user details mutation
  const updateUserDetailsMutation = useMutation<SimpleResponse, Error, UpdateUserDetailsPayload>({
    mutationFn: updateUserDetails,
    onSuccess: (data) => {
      if (data.success) {
        // We don't show a success message for intermediate steps
      } else {
        Toast.show(data.message || "Error updating details", Toast.SHORT, "bottom", "error");
      }
    },
    onError: (error) => {
      Toast.show("Failed to update details", Toast.SHORT, "bottom", "error");
    }
  });

  // Calendar sync mutations
  const syncMutation = useMutation<SimpleResponse, Error, void>({
    mutationFn: syncGoogleCalendar,
    onSuccess: (data) => {
      if (data.success) {
        setIsConnected(true);
        setLastSync("Just now");
        Toast.show("Calendar connected successfully!", Toast.SHORT);
      }
    },
    onError: (error) => {
      Toast.show("Failed to connect calendar", Toast.SHORT, "bottom", "error");
    }
  });

  const disconnectMutation = useMutation<SimpleResponse, Error, void>({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: (data) => {
      if (data.success) {
        setIsConnected(false);
        setLastSync(null);
        Toast.show("Calendar disconnected", Toast.SHORT);
      }
    },
    onError: (error) => {
      Toast.show("Failed to disconnect calendar", Toast.SHORT, "bottom", "error");
    }
  });

  // If loading is completed and no firstName, redirect to login
  useEffect(() => {
    if (!isLoading && !firstName && !authStorage.username) {
      Toast.show("Please login first", Toast.SHORT, "bottom", "error");
      router.replace("/auth");
    }
  }, [isLoading, firstName, authStorage.username]);

  const handleWelcomeNext = () => {
    if (!selectedSource) {
      Toast.show("Please select how you heard about us", Toast.SHORT, "bottom", "error");
      return;
    }
    setFormData((prev) => ({ ...prev, referred_from: selectedSource }));
    setCurrentStep(2);
  };

  const handleUserTypeNext = () => {
    if (!selectedUseCase) {
      Toast.show("Please select how you'll be using the app", Toast.SHORT, "bottom", "error");
      return;
    }
    setFormData((prev) => ({ ...prev, use_case: selectedUseCase }));
    setCurrentStep(3);
  };

  const handleProfessionalPathNext = () => {
    if (!selectedPath) {
      Toast.show("Please select your professional path", Toast.SHORT, "bottom", "error");
      return;
    }
    
    const updatedFormData = { 
      ...formData, 
      user_type: selectedPath 
    };
    
    setFormData(updatedFormData);
    
    // Update user details with professional path
    if (userDetailsData?.data.user) {
      updateUserDetailsMutation.mutate({
        user: {
          first_name: userDetailsData.data.user.first_name,
          last_name: userDetailsData.data.user.last_name || "",
        },
        profile: updatedFormData,
      });
    }
    
    setCurrentStep(4);
  };

  const handleConnectCalendar = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo) {
        syncMutation.mutate();
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      Toast.show("Failed to sign in with Google", Toast.SHORT, "bottom", "error");
    }
  };

  const handleDisconnectCalendar = () => {
    disconnectMutation.mutate();
  };

  const handleFinishOnboarding = () => {
    // Submit the complete form data
    submitOnboardingMutation.mutate(formData);
  };

  const handleSkipCalendar = () => {
    // Submit the form data without calendar integration
    submitOnboardingMutation.mutate(formData);
  };

  if (isLoading || isLoadingUserDetails) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Welcome Step
  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {firstName || authStorage.username || "there"}</Text>
        <Text style={styles.subtitle}>Let's personalize your experience</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <View style={styles.labelContainer}>
            <Ionicons name="globe-outline" size={20} color="#3B82F6" />
            <Text style={styles.label}>How did you hear about KaraX?</Text>
          </View>
          
          <SelectDropdown
            data={referralSources}
            defaultValue={selectedSource}
            onSelect={(selectedItem: string) => {
              setSelectedSource(selectedItem);
            }}
            buttonTextAfterSelection={(selectedItem: string) => selectedItem}
            rowTextForSelection={(item: string) => item}
            buttonStyle={styles.dropdown}
            buttonTextStyle={styles.dropdownText}
            dropdownStyle={styles.dropdownItems}
            rowStyle={styles.dropdownRow}
            rowTextStyle={styles.dropdownRowText}
            renderDropdownIcon={() => (
              <Ionicons name="chevron-down" size={20} color="#888" />
            )}
          />
        </View>

        <View style={styles.buttonContainer}>
          <View />
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handleWelcomeNext}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // User Type Step
  const renderUserTypeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Planning to use KaraX for work?</Text>
        <Text style={styles.subtitle}>Choose how you'll be using the app</Text>
      </View>

      <View style={styles.formContainer}>
        <TouchableOpacity 
          style={[styles.card, selectedUseCase === "personal" && styles.cardSelected]} 
          onPress={() => setSelectedUseCase("personal")}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="person" size={24} color="#3B82F6" />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>Personal Use</Text>
              <Text style={styles.cardSubtitle}>For individual and personal projects</Text>
            </View>
            <View style={[styles.radioOuter, selectedUseCase === "personal" && styles.radioOuterSelected]}>
              {selectedUseCase === "personal" && <View style={styles.radioInner} />}
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, selectedUseCase === "work" && styles.cardSelected]} 
          onPress={() => setSelectedUseCase("work")}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="work" size={24} color="#3B82F6" />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle}>Work Use</Text>
              <Text style={styles.cardSubtitle}>For professional and team collaboration</Text>
            </View>
            <View style={[styles.radioOuter, selectedUseCase === "work" && styles.radioOuterSelected]}>
              {selectedUseCase === "work" && <View style={styles.radioInner} />}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.outlineButton]} 
            onPress={() => setCurrentStep(1)}
          >
            <Ionicons name="arrow-back" size={20} color="#888" />
            <Text style={styles.outlineButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.primaryButton, 
              !selectedUseCase && styles.disabledButton
            ]} 
            onPress={handleUserTypeNext}
            disabled={!selectedUseCase}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Professional Path Step
  const renderProfessionalPathStep = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Professional Path</Text>
          <Text style={styles.subtitle}>Select the option that best describes your role</Text>
        </View>

        <View style={styles.formContainer}>
          <TouchableOpacity 
            style={[styles.card, selectedPath === "business_executive" && styles.cardSelected]} 
            onPress={() => setSelectedPath("business_executive")}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <MaterialIcons name="business-center" size={24} color="#3B82F6" />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>Business Executive</Text>
                <Text style={styles.cardSubtitle}>For business professionals and corporate leaders</Text>
              </View>
              <View style={[styles.radioOuter, selectedPath === "business_executive" && styles.radioOuterSelected]}>
                {selectedPath === "business_executive" && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={18} color="#3B82F6" />
                <Text style={styles.featureText}>AI-powered business insights</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={18} color="#3B82F6" />
                <Text style={styles.featureText}>Team collaboration tools</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, selectedPath === "student" && styles.cardSelected]} 
            onPress={() => setSelectedPath("student")}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons name="school" size={24} color="#3B82F6" />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>Student</Text>
                <Text style={styles.cardSubtitle}>For students and academic professionals</Text>
              </View>
              <View style={[styles.radioOuter, selectedPath === "student" && styles.radioOuterSelected]}>
                {selectedPath === "student" && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={18} color="#3B82F6" />
                <Text style={styles.featureText}>Study material organization</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={18} color="#3B82F6" />
                <Text style={styles.featureText}>Research assistance</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, selectedPath === "legal_professional" && styles.cardSelected]} 
            onPress={() => setSelectedPath("legal_professional")}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <FontAwesome5 name="balance-scale" size={24} color="#3B82F6" />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>Legal Professional</Text>
                <Text style={styles.cardSubtitle}>For lawyers and legal practitioners</Text>
              </View>
              <View style={[styles.radioOuter, selectedPath === "legal_professional" && styles.radioOuterSelected]}>
                {selectedPath === "legal_professional" && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={18} color="#3B82F6" />
                <Text style={styles.featureText}>Legal document analysis</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={18} color="#3B82F6" />
                <Text style={styles.featureText}>Case management</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, selectedPath === "other" && styles.cardSelected]} 
            onPress={() => setSelectedPath("other")}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <MaterialIcons name="stars" size={24} color="#3B82F6" />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>Other Profession</Text>
                <Text style={styles.cardSubtitle}>For all other professions</Text>
              </View>
              <View style={[styles.radioOuter, selectedPath === "other" && styles.radioOuterSelected]}>
                {selectedPath === "other" && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={18} color="#3B82F6" />
                <Text style={styles.featureText}>Customizable workflow</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={18} color="#3B82F6" />
                <Text style={styles.featureText}>Versatile tools</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.noteText}>
            Don't worry, you can always change this later in your settings
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.outlineButton]} 
              onPress={() => setCurrentStep(2)}
            >
              <Ionicons name="arrow-back" size={20} color="#888" />
              <Text style={styles.outlineButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.primaryButton, 
                !selectedPath && styles.disabledButton
              ]} 
              onPress={handleProfessionalPathNext}
              disabled={!selectedPath}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // Calendar Step
  const renderCalendarStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect Your Calendar</Text>
        <Text style={styles.subtitle}>Seamlessly sync your meetings and schedule</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <MaterialIcons name="event" size={24} color="#3B82F6" />
            <View style={{marginLeft: 12}}>
              <Text style={styles.calendarTitle}>Google Calendar</Text>
              <Text style={styles.calendarSubtitle}>
                Sync your meetings and events with Google Calendar
              </Text>
            </View>
          </View>

          {isConnected ? (
            <>
              <View style={styles.statusContainer}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Connected</Text>
                </View>
                {lastSync && (
                  <Text style={styles.syncText}>
                    Last synced: {lastSync}
                  </Text>
                )}
              </View>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
                  <Text style={styles.featureText}>
                    Automatic meeting synchronization
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
                  <Text style={styles.featureText}>
                    Automatic meeting Bot joining
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.disconnectButton}
                onPress={handleDisconnectCalendar}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text style={styles.disconnectText}>Disconnect</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={handleConnectCalendar}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.connectText}>Connect Google Calendar</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.helpCard}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.helpTitle}>Need help?</Text>
          </View>
          <Text style={styles.helpText}>
            You can always connect or change your calendar later in settings
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.outlineButton]} 
            onPress={() => setCurrentStep(3)}
          >
            <Ionicons name="arrow-back" size={20} color="#888" />
            <Text style={styles.outlineButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              isConnected ? styles.primaryButton : styles.outlineButton
            ]} 
            onPress={isConnected ? handleFinishOnboarding : handleSkipCalendar}
          >
            <Text style={isConnected ? styles.primaryButtonText : styles.outlineButtonText}>
              {isConnected ? "Finish" : "Skip for now"}
            </Text>
            <Ionicons 
              name="checkmark" 
              size={20} 
              color={isConnected ? "#000" : "#888"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderWelcomeStep();
      case 2:
        return renderUserTypeStep();
      case 3:
        return renderProfessionalPathStep();
      case 4:
        return renderCalendarStep();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {renderStep()}
        <View style={styles.progressContainer}>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStep - 1 ? styles.progressDotActive : 
                index < currentStep - 1 ? styles.progressDotCompleted : styles.progressDotInactive
              ]}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#121212',
  },
  stepContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#C1C1C1',
    textAlign: 'center',
    marginTop: 8,
  },
  formContainer: {
    marginTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  dropdown: {
    width: '100%',
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    height: 50,
  },
  dropdownText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdownItems: {
    backgroundColor: '#222',
    borderRadius: 8,
  },
  dropdownRow: {
    backgroundColor: '#222',
    borderBottomColor: '#444',
  },
  dropdownRowText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 110,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
  },
  primaryButtonText: {
    color: '#000000',
    fontWeight: '500',
    marginRight: 6,
    fontSize: 16,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#555',
  },
  outlineButtonText: {
    color: '#BBBBBB',
    marginLeft: 6,
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardSelected: {
    backgroundColor: '#1C2A3A',
    borderColor: '#3B82F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'white',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#C1C1C1',
    marginTop: 2,
  },
  radioOuter: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#3B82F6',
  },
  radioInner: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  featureList: {
    marginTop: 12,
    marginLeft: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  featureText: {
    fontSize: 14,
    color: '#C1C1C1',
    marginLeft: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginVertical: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
  },
  progressDotActive: {
    width: 16,
    backgroundColor: '#3B82F6',
  },
  progressDotCompleted: {
    width: 8,
    backgroundColor: '#3B82F6',
  },
  progressDotInactive: {
    width: 8,
    backgroundColor: '#444',
  },
  calendarCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'white',
  },
  calendarSubtitle: {
    fontSize: 14,
    color: '#C1C1C1',
  },
  statusContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#10B981',
  },
  syncText: {
    fontSize: 12,
    color: '#C1C1C1',
    marginTop: 4,
  },
  connectButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  connectText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
  },
  disconnectButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  disconnectText: {
    color: '#EF4444',
    fontSize: 16,
  },
  helpCard: {
    backgroundColor: '#162231',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 16,
    color: '#C1C1C1',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#C1C1C1',
    marginTop: 8,
  },
});
