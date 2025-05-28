import { Avatar } from "@/components/avatar/avatar";
import { CustomButton } from "@/components/button/CustomButton";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import useAuthStorage from "@/hooks/useAuthData";
import { Toast } from "@/utils/toast";
import { router } from "expo-router";
import { View, Text } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as Application from "expo-application";
import { ProductDetail } from "@/constants/Product";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { AntDesign } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { AppEnv } from "@/config/AppEnv";

export default function ProfileScreen() {
  const { clearAuthData, email, username } = useAuthStorage();
   const { subscriptionStatus } = useSubscriptionStatus();

  const handleLogout = async () => {
    await clearAuthData();
    await GoogleSignin.signOut();
    router.push("/auth");
    Toast.show("Successfully logout", Toast.SHORT);
  };

   const handleUpgrade = () => {
     Linking.openURL(`${AppEnv.shareHost}/dashboard/setting/upgrade`);
   };

   const handleManageSubscription = () => {
     Linking.openURL(`${AppEnv.shareHost}/dashboard/setting/subscription`);
   };

  return (
    <ThemeView>
      <View className="flex-1 items-center justify-start px-4 py-10">
        <Avatar size={150} />

        <View className="mt-4">
          <ThemeText className="text-lg text-center">{username}</ThemeText>
          <Text className="text-[#929292]">{email}</Text>
        </View>

        <View className="flex flex-col gap-4 mt-5 w-full max-w-sm px-4">
           {subscriptionStatus.isPending ? null : (
            <View className="flex flex-col gap-4">
              {subscriptionStatus?.data?.data.plan === "Trial" && (
                <CustomButton
                  onPress={handleUpgrade}
                  type="primary"
                  title={`${subscriptionStatus?.data?.data.trial_days_left} Days Left In Trial`}
                  className="py-3 text-white rounded-lg"
                  icon={
                    <AntDesign name="clockcircleo" size={22} color="white" />
                  }
                />
              )}

              {!subscriptionStatus?.data?.data.is_subscribed &&
                !subscriptionStatus?.data?.data.is_trial && (
                  <CustomButton
                    onPress={handleUpgrade}
                    type="primary"
                    title="Upgrade"
                    className="py-3 text-white rounded-lg"
                    icon={<AntDesign name="staro" size={22} color="white" />}
                  />
                )}

              <CustomButton
                onPress={handleManageSubscription}
                type="primary"
                title="Manage Subscription"
                className="py-3 text-white rounded-lg"
                icon={
                  <MaterialIcons
                    name="manage-accounts"
                    size={24}
                    color="white"
                  />
                }
              />
            </View>
          )}

          <CustomButton
            onPress={() => {
              router.push("/support");
            }}
            title="Support"
            type="primary"
            className="py-3 rounded-lg"
            icon={<AntDesign name="questioncircleo" size={20} color="white" />}
          />
          <CustomButton
            onPress={handleLogout}
            title="Logout"
            type="secondary"
            className="py-3 rounded-lg"
            icon={<MaterialIcons name="logout" size={24} color="black" />}
          />
        </View>

        <View className="flex-1 items-center justify-end">
          <Text
            className="text-[#929292] text-sm px-2"
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {Application.applicationName} {Application.nativeApplicationVersion}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            className="text-[#929292] text-sm px-2"
          >
            {ProductDetail.contact}
          </Text>
        </View>
      </View>
    </ThemeView>
  );
}
