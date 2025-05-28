import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Suspense, useEffect } from "react";
import Navigation from "@/navigation/navigation";
import "../global.css";
import Toast from "react-native-toast-message";
import { DBName, initializeDatabase } from "@/database/database";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/hooks/query";
import { AppEnv } from "@/config/AppEnv";
import { SQLiteProvider } from "expo-sqlite";
import { CustomFallBack } from "@/components/fallback/CustomFallBack";
import * as Linking from "expo-linking";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  console.log("apiUrl: ", AppEnv.apiUrl);
  const url = Linking.useURL();

  const configGoogleSignIn = () => {
    GoogleSignin.configure({
      webClientId:
        "967094347902-7cjcb6plk7nivjgtutof3m54j20n6ejq.apps.googleusercontent.com",
      iosClientId:
        "967094347902-rfs29427iog20tjla1agf2mf7v3pmnh5.apps.googleusercontent.com",
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  };

  useEffect(() => {
    configGoogleSignIn();
    console.log("initializeGoogleSignIn");
  }, []);

  useEffect(() => {
    console.log("DeepLink:", url);
  }, [url]);

  useEffect(() => {
    initializeDatabase();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={"light-content"} />
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<CustomFallBack />}>
            <SQLiteProvider databaseName={DBName} useSuspense>
              <Navigation />
              <Toast />
            </SQLiteProvider>
          </Suspense>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}