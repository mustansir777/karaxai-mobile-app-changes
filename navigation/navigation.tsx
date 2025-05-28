import { Header } from "@/components/header/header";
import { Screen } from "@/config/Screen";
import useAuthStorage from "@/hooks/useAuthData";
import { Stack } from "expo-router";

export default function Navigation() {
  const { token } = useAuthStorage();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
        redirect={!!token}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          header: () => <Header />,
        }}
      />
      <Stack.Screen name={Screen.AuthScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name={Screen.ForgotSceen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Screen.ResetScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name={Screen.RecordingView}
        options={{
          header: () => <Header />,
        }}
      />
      <Stack.Screen
        name={Screen.Participants}
        options={{
          header: () => <Header />,
        }}
      />
      <Stack.Screen
        name={Screen.Ask}
        options={{
          header: () => <Header />,
        }}
      />
      <Stack.Screen
        name={Screen.Profile}
        options={{
          header: () => <Header />,
        }}
      />

      <Stack.Screen name={Screen.Activation} options={{ headerShown: false }} />

      <Stack.Screen name={Screen.Support} options={{ headerShown: true }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
