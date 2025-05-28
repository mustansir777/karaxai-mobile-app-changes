import { Tabs } from "expo-router";
import React, { useState } from "react";
import { Platform, View, TouchableOpacity, StyleSheet } from "react-native";
import { HapticTab } from "@/components/HapticTab";
import { Screen } from "@/config/Screen";
import useDoubleBackExit from "@/hooks/useDoubleBack";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome5";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { RecordBottomSheet } from "../../components/modal/RecordBottomSheet";

export default function TabLayout() {
  useDoubleBackExit();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const openBottomSheet = () => {
    setIsBottomSheetVisible(true);
  };

  const closeBottomSheet = () => {
    setIsBottomSheetVisible(false);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#004aad",
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: "#090409",
            height: Platform.OS === "ios" ? 80 : 60,
            borderTopWidth: 0,
            elevation: 0,
          },
        }}
      >
        <Tabs.Screen
          name={Screen.RecordingList}
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="home-outline"
                size={28}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name={Screen.Calendar}
          options={{
            title: "Calendar",
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar-outline" size={26} color={color} />
            ),
          }}
        />
        {/* Add a hidden tab for the center button */}
        <Tabs.Screen
          name="record-button"
          options={{
            title: "",
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.recordButton}
                onPress={openBottomSheet}
                activeOpacity={0.8}
              >
                <View style={styles.gradient}>
                  <FontAwesome5 name="microphone-alt" size={30} color="white" />
                </View>
              </TouchableOpacity>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              // Prevent default action (navigation)
              e.preventDefault();
              openBottomSheet();
            },
          }}
        />
        <Tabs.Screen
          name={Screen.Folders}
          options={{
            title: "Folders",
            tabBarIcon: ({ color }) => (
              <FontAwesome name="folder" size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name={Screen.Settings}
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings-outline" size={26} color={color} />
            ),
          }}
        />
      </Tabs>

      <RecordBottomSheet
        visible={isBottomSheetVisible}
        onClose={closeBottomSheet}
      />
    </>
  );
}

const styles = StyleSheet.create({
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -30, // Lift the button up above the tab bar
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    padding: 5,
  },
  gradient: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0052D4", // Use a solid color instead of gradient
  },
});