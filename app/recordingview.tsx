import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { CustomButton } from "@/components/button/CustomButton";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/card/card";
import { CardColors } from "@/constants/CardColors";
import { AskButton } from "@/components/ask/askButton";
import { Feedback } from "@/components/feedback/Feedback";
import { useEffect, useState } from "react";
import { RecordingItem, tableName } from "@/database/database";
import { useSQLiteContext } from "expo-sqlite";
import {
  ActionPoints,
  KeyTakeAways,
  Participants,
  SuggestedMessage,
  Topics,
} from "@/api/api";
import { ShareRecording } from "@/components/share/ShareRecording";
import { DownloadReport } from "@/components/download/DownloadReport";
import { Dummyicipants } from "@/constants/dummyParticipants";
import { ParticipantAvatar } from "@/components/avatar/participantAvatar";
import { AudioPlayer } from "@/components/AudioPlayer/AudioPlayer";
import { AudioPlayerModal } from "@/components/AudioPlayer/AudioPlayerModal";
import { useTranscript } from "@/hooks/useTranscript";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { Toast } from "@/utils/toast";

export default function RecordingViewScreen() {
  const { eventID } = useLocalSearchParams<{ eventID: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const db = useSQLiteContext();
  const [recordingDetail, setRecodingDetail] = useState<RecordingItem | null>(
    null
  );

  const { subscriptionStatus } = useSubscriptionStatus();
  const { data, isPending } = useTranscript(eventID);

  const isPublic = recordingDetail?.is_public ?? false;

  async function getRecordingDetail() {
    try {
      setLoading(true);
      const recordingDetail = await db.getFirstAsync<RecordingItem>(
        `SELECT * FROM ${tableName} WHERE event_id = ?`,
        [eventID]
      );
      setRecodingDetail(recordingDetail);
    } catch (error) {
      console.error("Error fetching recording details:", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getRecordingDetail();
  }, [eventID]);

  const actionPoints: ActionPoints[] = (() => {
    if (!recordingDetail?.action_points) {
      return [];
    }

    if (typeof recordingDetail.action_points === "string") {
      try {
        return JSON.parse(recordingDetail.action_points) as ActionPoints[];
      } catch (error) {
        console.error("Error parsing action_points:", error);
        return [];
      }
    }
    return recordingDetail.action_points;
  })();

  const topics: Topics[] = (() => {
    if (!recordingDetail?.topics) {
      return [];
    }

    if (typeof recordingDetail.topics === "string") {
      try {
        return JSON.parse(recordingDetail.topics) as Topics[];
      } catch (error) {
        console.error("Error parsing topic:", error);
        return [];
      }
    }
    return recordingDetail.topics;
  })();

  const keyTakeWays: KeyTakeAways[] = (() => {
    if (!recordingDetail?.key_takeaways) {
      return [];
    }

    if (typeof recordingDetail.key_takeaways === "string") {
      try {
        return JSON.parse(recordingDetail.key_takeaways) as Topics[];
      } catch (error) {
        console.error("Error parsing keytakeways:", error);
        return [];
      }
    }
    return recordingDetail.key_takeaways;
  })();

  const suggestedMessage: SuggestedMessage[] = (() => {
    if (!recordingDetail?.questions) {
      return [];
    }

    if (typeof recordingDetail.questions === "string") {
      try {
        return JSON.parse(recordingDetail.questions) as SuggestedMessage[];
      } catch (error) {
        console.error("Error parsing questions:", error);
        return [];
      }
    }
    return recordingDetail.questions;
  })();

  const participants: Participants[] = (() => {
    if (!recordingDetail?.participants) {
      return [];
    }

    if (typeof recordingDetail.participants === "string") {
      try {
        return JSON.parse(recordingDetail.participants) as Participants[];
      } catch (error) {
        console.error("Error parsing questions:", error);
        return [];
      }
    }
    return recordingDetail.participants;
  })();

  const actionPointsTexts = actionPoints.map((point) => point.item_text);
  const topicsPointsTexts = topics.map((topic) => {
    return `${topic.item_text} - ${topic.description}`;
  });
  const keyTakeWaysTexts = keyTakeWays.map(
    (keyTakeWays) => keyTakeWays.item_text
  );
  const suggestedMessageTexts = suggestedMessage.map(
    (message) => message.item_text
  );

  const participantsList = participants.map((participant) => participant);
  const participantCount = participants.length ?? 0;

  if (error) {
    return (
      <ThemeView>
        <View className="flex-1 justify-center items-center">
          <ThemeText className="text-lg">
            Error fetching recording details
          </ThemeText>
        </View>
      </ThemeView>
    );
  }

  if (loading) {
    return (
      <ThemeView>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#004aad" />
        </View>
      </ThemeView>
    );
  }

  return (
    <ThemeView>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center w-full px-4 gap-2">
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
            <Text
              style={{
                color: "#7B8388",
                fontSize: 14,
                width: 100,
                textOverflow: "ellipsis",
              }}
              numberOfLines={1}
            >
              {recordingDetail?.subject}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="flex-row items-center bg-button-primary px-2 rounded-lg gap-2">
              <ShareRecording
                eventID={eventID}
                is_public={isPublic}
                onRefresh={getRecordingDetail}
                isDisabled={recordingDetail?.summary == ""}
              />
              <Text className="bg-button-primary text-[#464646] px-1 py-3">
                |
              </Text>
              <DownloadReport
                eventID={eventID}
                isDisabled={recordingDetail?.summary == ""}
              />
              <Text className="bg-button-primary text-[#464646] px-1 py-3">
                |
              </Text>
              <AudioPlayerModal
                audioSrc={data?.data.meeting_mp3 ?? ""}
                isDisabled={recordingDetail?.summary == ""}
              />
              <Text className="bg-button-primary text-[#464646] px-1 py-3">
                |
              </Text>
              <Feedback
                eventID={eventID}
                isDisabled={recordingDetail?.summary == ""}
              />
            </View>
          </View>
        </View>

        {recordingDetail?.error_message && (
          <View
            style={{
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                paddingHorizontal: 28,
                paddingVertical: 8,
                marginVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "red",
                borderStyle: "dotted",
              }}
            >
              <Text
                style={{
                  color: "red",
                  textAlign: "center",
                }}
              >
                {recordingDetail?.error_message}
              </Text>
            </View>
          </View>
        )}

        <ScrollView className="px-6">
          {/* Meeting Summary */}
          <View className="mt-5 px-1">
            <ThemeText className="font-bold text-xl">Meeting Summary</ThemeText>
            <Text className="text-[##BBBBBB] mt-1">
              {recordingDetail?.summary || "No summary available"}
            </Text>
          </View>

          {/* Meeting Summary items */}
          <View className="flex-col gap-2 mt-4 pb-5">
            <Card
              color={CardColors.actionPoints}
              title="Action Points"
              points={actionPointsTexts}
            />
            <Card
              color={CardColors.topic}
              title="Topics"
              points={topicsPointsTexts}
            />
            <Card
              color={CardColors.keyTakeWays}
              title="Key Takeaways"
              points={keyTakeWaysTexts}
            />
          </View>

          {/* Participants header */}
          <View className="flex-row justify-between items-center w-full px-4">
            <ThemeText className="text-xl font-bold">
              Participants ({participantCount})
            </ThemeText>
            {/* <TouchableOpacity
              onPress={() =>
                router.push(
                  `/participants?participants=${JSON.stringify(
                    participants
                  )}&title=${recordingDetail?.subject}`
                )
              }
              className="flex-row items-start justify-start"
            >
              <Text className="text-[#004aad] text-md">View all</Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={18}
                color="#004aad"
              />
            </TouchableOpacity> */}
          </View>

          {/* Participants List */}
          <View className="flex-col gap-2 mt-2 px-4">
            {participantsList.map((participant) => (
              <ParticipantAvatar
                key={participant.name}
                source={participant.image || ""}
                name={participant.name}
              />
            ))}
          </View>

          <View className="h-10" />
        </ScrollView>

        {/* Ask */}
        <AskButton
          disabled={suggestedMessageTexts.length === 0}
          onPress={() => {
            if (subscriptionStatus?.data?.data.features.chat) {
              router.push(
                `/ask?suggestedQA=${suggestedMessageTexts}&eventID=${eventID}&recordingName=${recordingDetail?.subject}`
              );
            } else {
              Toast.show(
                "This feature is not available in your plan",
                Toast.SHORT,
                "bottom",
                "error"
              );
            }
          }}
        />
      </View>
    </ThemeView>
  );
}
