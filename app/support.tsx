import { AppEnv } from "@/config/AppEnv";
import { View } from "react-native";
import { WebView } from "react-native-webview";

export default function SupportScreen() {
  const url = `${AppEnv.shareHost}/support?source=app`;

  return (
    <View className="flex-1">
      <WebView source={{ uri: url }} />
    </View>
  );
}
