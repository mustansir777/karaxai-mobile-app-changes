import { CustomButton } from "@/components/button/CustomButton";
import Logo from "@/components/logo/Logo";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import GoogleIcon from "@/components/icon/GoogleIcon";
import { useForm } from "react-hook-form";
import InputWithLabel from "@/components/input/inputWithLabel";
import { Link, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useAuthStorage from "@/hooks/useAuthData";
import useDoubleBackExit from "@/hooks/useDoubleBack";
import { useMutation } from "@tanstack/react-query";
import { axiosApi } from "@/api/api";
import { Toast } from "@/utils/toast";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { AppleAuthButton } from "@/components/appleAuth/AppleAuth";
import { ProductDetail } from "@/constants/Product";

const loginSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

const registerSchema = loginSchema.extend({
  first_name: z.string().min(1, "Name is required"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

type loginType = "login" | "register";

export default function AuthScreen() {
  const [authType, setAuthType] = useState<loginType>("login");
  const [isShowPassword, setIsShowPassword] = useState(false);
  const schema = authType === "login" ? loginSchema : registerSchema;
  const { control, handleSubmit, reset } = useForm<LoginData | RegisterData>({
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
    },
    resolver: zodResolver(schema),
  });
  useDoubleBackExit();
  const [isLoadingGoogleAuth, setIsLoadingGoogleAuth] = useState(false);
  const { saveAuthData } = useAuthStorage();

  const handleSwtichAuthType = () => {
    setAuthType((prev) => (prev === "login" ? "register" : "login"));
    reset();
  };

  // Add onboarding API mutation
  const onboardingApi = useMutation({
    mutationKey: ["onboardingApi"],
    mutationFn: async (payload: { user_id: number; platform: string }) => {
      const response = await axiosApi({
        url: "/onboarding/" as any,
        method: "POST",
        data: payload,
      }).then((e) => e.data);
      return response;
    },
  });

  const loginApi = useMutation({
    mutationKey: ["loginApi"],
    mutationFn: async (payload: LoginData) => {
      const response = await axiosApi({
        url: "/login/",
        method: "POST",
        data: payload,
      }).then((e) => e.data);
      return response;
    },
  });

  const registerApi = useMutation({
    mutationKey: ["registerApi"],
    mutationFn: async (payload: RegisterData) => {
      const response = await axiosApi({
        url: "/register/",
        method: "POST",
        params: {
          platform: "mobile",
        },
        data: {
          email: payload.email,
          password: payload.password,
          password2: payload.password,
          first_name: payload.first_name,
        },
      }).then((e) => e.data);
      return response;
    },
  });

  // Function to handle onboarding after successful login
  const handleOnboarding = async (userId: number) => {
    try {
      await onboardingApi.mutateAsync({
        user_id: userId,
        platform: "mobile"
      });
      Toast.show("Account setup completed!", Toast.SHORT);
    } catch (error) {
      console.log("Onboarding error:", error);
      // Don't show error to user as onboarding might be optional
      // or might already be completed
    }
  };

  const googleAuthSignIn = async () => {
    try {
      setIsLoadingGoogleAuth(true);
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();

      if (isSuccessResponse(res)) {
        console.log("googleAuth", res);
        const response = await axiosApi({
          url: "/google-auth/",
          method: "POST",
          params: {
            no_redirect_uri: 1,
          },
          data: {
            code: res.data?.serverAuthCode || "",
          },
        }).then((e) => e.data);

        console.log("response", response);

        if (response.token) {
          saveAuthData({
            userId: response.user_id.toString(),
            username: response.first_name,
            token: response.token,
            email: response.email,
            image: response.profile_pic,
          });
          
          // Call onboarding for Google sign-in users
          await handleOnboarding(response.user_id);
          
          setIsLoadingGoogleAuth(false);
          Toast.show("Login Successfully!", Toast.SHORT);
          router.push("/(tabs)/recordinglist");
        } else {
          setIsLoadingGoogleAuth(false);
          Toast.show("Login failed retry.", Toast.SHORT, "bottom", "error");
        }
      } else {
        setIsLoadingGoogleAuth(false);
        console.log("res", res);
        Toast.show("Login failed retry.", Toast.SHORT, "bottom", "error");
      }
    } catch (error) {
      setIsLoadingGoogleAuth(false);
      console.log("Error", error);
      Toast.show("Login failed", Toast.SHORT, "bottom", "error");
    }
  };

  const onSubmit = (data: LoginData | RegisterData) => {
    console.log("formData", data);
    if (authType === "login") {
      loginApi
        .mutateAsync(data as LoginData)
        .then(async (e) => {
          console.log(e);
          if (e.token) {
            saveAuthData({
              userId: e.user_id.toString(),
              username: e.first_name,
              token: e.token,
              email: e.email,
              image: "",
            });
            
            // // Call onboarding for regular login users
            // await handleOnboarding(e.user_id);
            
            router.replace("/(tabs)/recordinglist");
            Toast.show("Login Successfully!", Toast.SHORT);
          }
        })
        .catch((e) => {
          const meesage = e.message?.message || "Login failed";
          Toast.show(meesage, Toast.SHORT, "bottom", "error");
          if (
            e.message?.message ===
            "Please verify your emails to login to your account."
          ) {
            router.push("/activate");
          }
        });
    } else {
      registerApi
        .mutateAsync(data as RegisterData)
        .then((e) => {
          Toast.show(e.message, Toast.SHORT);
          router.push("/activate");
        })
        .catch((e) =>
          Toast.show(
            e.message?.message || e.message?.email || e.message?.password,
            Toast.SHORT,
            "bottom",
            "error"
          )
        );
    }
  };

  return (
    <ThemeView>
      <ScrollView automaticallyAdjustKeyboardInsets={true} contentContainerClassName="flex-grow">
        <View className="flex-1 items-start justify-end">
          <View className="h-1/4 flex-1 items-start justify-end mb-6 px-4">
            <View className="flex flex-col gap-8">
              <Logo />
              <View>
                <ThemeText className="text-2xl">
                  {authType === "login"
                    ? `Welcome back to ${ProductDetail.name}`
                    : `Welcome to ${ProductDetail.name}`}
                </ThemeText>
                <ThemeText className="text-lg opacity-50">
                  {authType === "login"
                    ? "Enter your email and password to continue!"
                    : "Create your Account"}
                </ThemeText>
              </View>
            </View>
          </View>
          <View className="bg-background-primary pt-5 rounded-t-[34px] w-full">
            <View className="flex-grow items-center justify-center py-4">
              <View className="w-full max-w-sm py-10">
                {/* Social Login */}
                <CustomButton
                  disabled={isLoadingGoogleAuth}
                  isLoading={isLoadingGoogleAuth}
                  title="Continue with Google"
                  onPress={googleAuthSignIn}
                  icon={<GoogleIcon />}
                  className="bg-button-primary rounded-lg py-3 mt-5"
                />

                {Platform.OS === "ios" && <AppleAuthButton />}

                {/* Divider Line */}
                <View className="flex-row items-center my-6">
                  <View className="flex-grow h-[1px] bg-background-secondary" />
                  <ThemeText className="mx-4 text-sm text-gray-400">
                    Or
                  </ThemeText>
                  <View className="flex-grow h-[1px] bg-background-secondary" />
                </View>

                {/* Email and Password Inputs */}
                <View className="flex-col gap-4">
                  {authType === "register" && (
                    <InputWithLabel
                      control={control}
                      name="first_name"
                      label="Name"
                      placeholder="Enter your name"
                    />
                  )}

                  <InputWithLabel
                    control={control}
                    name="email"
                    label="Email"
                    placeholder="Enter your email"
                  />

                  <InputWithLabel
                    control={control}
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    secureTextEntry={!isShowPassword}
                    iconRight={
                      <TouchableOpacity
                        onPress={() => setIsShowPassword(!isShowPassword)}
                      >
                        {isShowPassword ? (
                          <Ionicons
                            name="eye-outline"
                            size={20}
                            color="white"
                          />
                        ) : (
                          <Ionicons
                            name="eye-off-outline"
                            size={20}
                            color="white"
                          />
                        )}
                      </TouchableOpacity>
                    }
                    type="password"
                  />

                  {/* Forgot Password Link aligned to the right */}
                  {authType === "login" && (
                    <View className="flex items-end justify-end">
                      <Link href={"/forgot"}>
                        <Text className="text-[#C1C1C1] text-sm underline">
                          Forgot Password
                        </Text>
                      </Link>
                    </View>
                  )}

                  <CustomButton
                    title={authType === "login" ? "Login now" : "Register now"}
                    type="secondary"
                    className="mt-4 bg-white rounded-lg py-3"
                    isLoading={loginApi.isPending || registerApi.isPending || onboardingApi.isPending}
                    disabled={loginApi.isPending || registerApi.isPending || onboardingApi.isPending}
                    onPress={handleSubmit(onSubmit)}
                  />
                </View>

                {/* Sign Up Link centered at the bottom */}
                <TouchableOpacity onPress={handleSwtichAuthType}>
                  <View className="flex items-center justify-center mt-5">
                    <Text className="text-[#C1C1C1] text-sm">
                      {authType === "login"
                        ? "Don't have an Account? "
                        : "Already have an Account? "}
                      <Text className="text-primary text-white">
                        {authType === "login" ? "Register" : "Login now"}
                      </Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemeView>
  );
}