// app/index.tsx
import React, { useEffect } from "react";
import { View } from "react-native";
import Logo from "@/components/logo/Logo";
import { ThemeText } from "@/components/theme/ThemeText";
import { router } from "expo-router";
import { ThemeView } from "@/components/theme/ThemeView";
import { ProductDetail } from "@/constants/Product";
import useAuthStorage from "@/hooks/useAuthData";

export default function SplashScreen() {
  const { token } = useAuthStorage();

  useEffect(() => {
    // Auto-navigate to auth after a short delay
    const timer = setTimeout(() => {
      if (token) {
        router.replace('/(tabs)/recordinglist');
      } else {
        router.replace('/auth');
      }
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, [token]);
  
  return (
    <ThemeView>
       <View className="flex-1 items-start justify-center px-4">
        <Logo />
        <View className="mt-5">
          <ThemeText className="text-white text-7xl font-thin pt-4">
            Effortless Meeting Notes with
          </ThemeText>
          <ThemeText className="text-white text-7xl font-bold pt-1">
            {ProductDetail.name}
          </ThemeText>
          <ThemeText className="text-sm mt-4 tracking-widest text-left text-[#BBBBBB]">
            AI-Powered meeting notes with transcription, summarization, and
            smart organization for enhanced productivity & seamless integration!
          </ThemeText>
        </View>
      </View>
    </ThemeView>
  );
}