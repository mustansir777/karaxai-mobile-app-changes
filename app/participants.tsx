import { Participants } from "@/api/api";
import { ParticipantAvatar } from "@/components/avatar/participantAvatar";
import { CustomButton } from "@/components/button/CustomButton";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View, Text } from "react-native";

export default function ParticipantsScreen() {
  const { participants, title } = useLocalSearchParams<{
    participants: string;
    title: string;
  }>();

  const participantsList: Participants[] = JSON.parse(participants);
  console.log("participantsList", participantsList);

  return (
    <ThemeView>
      <View className="px-4 flex-col gap-4">
        <View className="flex-row items-center gap-2">
          <CustomButton
            onPress={() => router.back()}
            icon={
              <MaterialIcons
                name="arrow-back-ios-new"
                size={20}
                color="white"
              />
            }
            className="p-2 rounded-full"
          />
          <Text className="text-[#7B8388]">{title}</Text>
        </View>
        <ThemeText className="text-3xl">All Participants</ThemeText>
      </View>

      <ScrollView className="px-4">
        <View className="flex-col gap-4 mt-4">
          {participantsList.map((participant, index) => (
            <ParticipantAvatar
              key={index}
              source={participant.image || ""}
              name={participant.name}
            />
          ))}
        </View>
      </ScrollView>
    </ThemeView>
  );
}
