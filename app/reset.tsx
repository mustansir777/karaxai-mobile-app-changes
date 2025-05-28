import { CustomButton } from "@/components/button/CustomButton";
import Logo from "@/components/logo/Logo";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import { TouchableOpacity, View } from "react-native";
import { useForm } from "react-hook-form";
import InputWithLabel from "@/components/input/inputWithLabel";
import { router, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { axiosApi } from "@/api/api";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import { Toast } from "@/utils/toast";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

const resetSchema = z
  .object({
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    confirm_password: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords must match",
    path: ["confirm_password"],
  });

type ResetData = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const { uid, token } = useLocalSearchParams<{ uid: string; token: string }>();
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [isShowConfirmPassword, setIsShowConfirmPassword] = useState(false);

  const { control, handleSubmit } = useForm<ResetData>({
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
    resolver: zodResolver(resetSchema),
  });

  console.log("UID and token: ", uid, token);

  const resetPasswordApi = useMutation({
    mutationKey: ["forgotPassword"],
    mutationFn: async (payload: ResetData) => {
      const response = axiosApi({
        url: makeUrlWithParams("/reset-password/{{uid}}/{{token}}/", {
          uid: uid,
          token: token,
        }),
        method: "POST",
        data: payload,
      }).then((e) => e.data);
      return response;
    },
  });

  const onSubmit = (data: ResetData) => {
    resetPasswordApi
      .mutateAsync(data)
      .then((e) => {
        if (e.message.includes("Password has been changed successfully")) {
          Toast.show(e.message, Toast.SHORT, "top", "success");
          router.push("/auth");
        } else {
          Toast.show(e.message || "Failed", Toast.SHORT, "top", "error");
        }
      })
      .catch((e) =>
        Toast.show(
          e.message?.message || "Reset failed",
          Toast.SHORT,
          "top",
          "error"
        )
      );
  };

  return (
    <ThemeView>
      <View className="flex-1 items-start justify-end">
        <View className="h-1/4 flex-1 items-start justify-end mb-6 px-4">
          <View className="flex flex-col gap-8">
            <Logo />
            <View>
              <ThemeText className="text-2xl">Reset your password</ThemeText>
              <ThemeText className="text-lg opacity-50">
                Create a new password
              </ThemeText>
            </View>
          </View>
        </View>
        <View className="bg-background-primary  h-3/4 rounded-t-[34px] w-full ">
          <View className="flex-1 items-center justify-center py-4">
            <View className="w-full max-w-sm py-10">
              {/* Email and Password Inputs */}
              <View className="flex-col gap-4">
                <InputWithLabel
                  control={control}
                  name="new_password"
                  label="Password"
                  placeholder="Enter your new password"
                  secureTextEntry={!isShowPassword}
                  iconRight={
                    <TouchableOpacity
                      onPress={() => setIsShowPassword(!isShowPassword)}
                    >
                      {isShowPassword ? (
                        <Ionicons name="eye-outline" size={20} color="white" />
                      ) : (
                        <Ionicons name="eye-off-outline" size={20} color="white" />
                      )}
                    </TouchableOpacity>
                  }
                />

                <InputWithLabel
                  control={control}
                  name="confirm_password"
                  label="Confirm Password"
                  placeholder="Confirm your new password"
                  secureTextEntry={!isShowConfirmPassword}
                  iconRight={
                    <TouchableOpacity
                      onPress={() =>
                        setIsShowConfirmPassword(!isShowConfirmPassword)
                      }
                    >
                      {isShowConfirmPassword ? (
                        <Ionicons name="eye-outline" size={20} color="white" />
                      ) : (
                        <Ionicons name="eye-off-outline" size={20} color="white" />
                      )}
                    </TouchableOpacity>
                  }
                />

                <CustomButton
                  title="Reset Password"
                  type="secondary"
                  className="mt-4 bg-white rounded-lg py-3"
                  onPress={handleSubmit(onSubmit)}
                />

                <CustomButton
                  title="Login"
                  type="primary"
                  className="rounded-lg py-3"
                  onPress={() => router.push("/auth")}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </ThemeView>
  );
}
