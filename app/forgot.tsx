import { CustomButton } from "@/components/button/CustomButton";
import Logo from "@/components/logo/Logo";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import { View } from "react-native";
import { useForm } from "react-hook-form";
import InputWithLabel from "@/components/input/inputWithLabel";
import { router } from "expo-router";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { axiosApi } from "@/api/api";
import { Toast } from "@/utils/toast";

export const forgotSchema = z.object({
  email: z.string().email().min(1, "Email is required"),
});

export type ForgotData = z.infer<typeof forgotSchema>;

export default function ForgotScreen() {
  const { control, handleSubmit, reset } = useForm<ForgotData>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(forgotSchema),
  });

  const forgotPasswordApi = useMutation({
    mutationKey: ["forgotPassword"],
    mutationFn: async (payload: ForgotData) => {
      const response = axiosApi({
        url: "/forgot-password/",
        method: "POST",
        data: payload,
      }).then((e) => e.data);
      return response;
    },
  });

  const onSubmit = (data: ForgotData) => {
    forgotPasswordApi
      .mutateAsync(data)
      .then((e) => {
        reset();
        Toast.show(
          e.message || "Reset password link sent to your email",
          Toast.SHORT
        );
      })
      .catch((e) =>
        Toast.show(
          e.message?.message || "Resent failed",
          Toast.SHORT,
          "bottom",
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
              <ThemeText className="text-2xl">Forgot Password</ThemeText>
              <ThemeText className="text-lg opacity-50">
                Enter your email to reset your password
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
                  name="email"
                  label="Email"
                  placeholder="Enter your email"
                />

                <CustomButton
                  isLoading={forgotPasswordApi.isPending}
                  disabled={forgotPasswordApi.isPending}
                  title="Send passsword reset link"
                  type="secondary"
                  className="mt-4 bg-white rounded-lg py-3"
                  onPress={handleSubmit(onSubmit)}
                />

                <CustomButton
                  title="back to login"
                  type="primary"
                  className="rounded-lg py-3"
                  onPress={() => router.back()}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </ThemeView>
  );
}
