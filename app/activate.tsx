import { CustomButton } from "@/components/button/CustomButton";
import Logo from "@/components/logo/Logo";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { axiosApi } from "@/api/api";
import { Toast } from "@/utils/toast";
import { OtpInput, OtpInputRef } from "react-native-otp-entry";
import { useForm } from "react-hook-form";
import { ForgotData, forgotSchema } from "./forgot";
import { zodResolver } from "@hookform/resolvers/zod";
import InputWithLabel from "@/components/input/inputWithLabel";
import { useRef, useState } from "react";

export default function ActivationScreen() {
  // const { id } = useLocalSearchParams<{ id: string }>();
  // console.log("activationKey ", id);
  const otpRef = useRef<OtpInputRef | null>(null);
  const [type, setType] = useState<"otp" | "resend">("otp");
  const [otp, setOtp] = useState("");
  const { control, handleSubmit } = useForm<ForgotData>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(forgotSchema),
  });

  const activationApi = useMutation({
    mutationKey: ["activationApi"],
    mutationFn: async (payload: { otp: string }) => {
      const response = axiosApi({
        url: "/validate-token/",
        method: "POST",
        data: payload,
      }).then((e) => e.data);
      return response;
    },
  });

  const resendEmailApi = useMutation({
    mutationKey: ["resendEmail"],
    mutationFn: async (payload: ForgotData) => {
      const response = axiosApi({
        url: "/resend-confirmation/",
        method: "POST",
        params: {
          platform: "mobile",
        },
        data: payload,
      }).then((e) => e.data);
      return response;
    },
  });

  const handleResend = (data: ForgotData) => {
    console.log("data", data);
    resendEmailApi
      .mutateAsync(data)
      .then((e) => {
        Toast.show(e.message, Toast.SHORT, "bottom", "success");
        setType("otp");
      })
      .catch((e) => {
        const errorMessage = e.message?.message as string;
        Toast.show(errorMessage, Toast.SHORT, "bottom", "error");
      });
  };

  const validateToken = () => {
    console.log("otp", otp);
    activationApi
      .mutateAsync({
        otp: otp,
      })
      .then((e) => {
        Toast.show(
          e.message + " You can login now",
          Toast.SHORT,
          "top",
          "success"
        );
        router.push("/auth");
      })
      .catch((e) => {
        otpRef.current?.clear();
        Toast.show(e.message?.message, Toast.SHORT, "bottom", "error");
      });
  };
  return (
    <ThemeView>
      <View className="flex-1 items-start justify-end">
        <View className="h-1/3 flex-1 items-start justify-end mb-6 px-4">
          <View className="flex flex-col gap-8">
            <Logo />
            <View>
              <ThemeText className="text-2xl">Activate your account</ThemeText>
              <ThemeText className="text-lg opacity-50">
                {type === "otp"
                  ? "Please activate your account with OTP code sent to your email"
                  : "Resend OTP code"}
              </ThemeText>
            </View>
          </View>
        </View>
        <View className="bg-background-primary  h-2/3 rounded-t-[34px] w-full ">
          <View className="flex-1 items-center justify-center py-4">
            <View className="w-full max-w-sm py-10">
              {type === "otp" ? (
                <View className="flex-col gap-2">
                  <OtpInput
                    ref={otpRef}
                    numberOfDigits={6}
                    placeholder="******"
                    onTextChange={(text) => setOtp(text)}
                    type="numeric"
                    theme={{
                      pinCodeTextStyle: {
                        fontSize: 24,
                        fontWeight: "bold",
                        color: "white",
                      },
                      filledPinCodeContainerStyle: {
                        backgroundColor: "#212121",
                        borderRadius: 10,
                        borderWidth: 0.5,
                      },
                      focusedPinCodeContainerStyle: {
                        borderColor: "#004aad",
                      },
                      focusStickStyle: {
                        backgroundColor: "#004aad",
                      },
                    }}
                  />

                  <CustomButton
                    disabled={activationApi.isPending || otp.length < 6}
                    isLoading={activationApi.isPending}
                    onPress={validateToken}
                    title="Verify OTP"
                    type="secondary"
                    className="mt-4 bg-white rounded-lg py-3"
                  />
                  <CustomButton
                    onPress={() => otpRef.current?.clear()}
                    title="Clear"
                    type="secondary"
                    className="mt-2 bg-white rounded-lg py-3"
                  />
                </View>
              ) : (
                <InputWithLabel
                  control={control}
                  name="email"
                  label="Email"
                  placeholder="Enter your email"
                />
              )}

              <CustomButton
                title="Resend OTP"
                disabled={resendEmailApi.isPending}
                isLoading={resendEmailApi.isPending}
                type="primary"
                className="rounded-lg py-3 mt-4"
                onPress={
                  type === "otp"
                    ? () => setType("resend")
                    : handleSubmit(handleResend)
                }
              />
            </View>
          </View>
        </View>
      </View>
    </ThemeView>
  );
}