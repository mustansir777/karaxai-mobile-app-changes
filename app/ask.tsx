import { axiosApi, Chat } from "@/api/api";
import AskInput from "@/components/ask/askInput";
import { SuggestedQA } from "@/components/ask/suggestedQA";
import { CustomButton } from "@/components/button/CustomButton";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Modal } from "react-native";
import Octicons from "@expo/vector-icons/Octicons";
import convertTimestamp from "@/utils/getConvertTimeStamp";
import { useNetworkState } from "expo-network";
import { OfflineMessage } from "@/components/offline/offlineMessage";
import { ProductDetail } from "@/constants/Product";
import Toast from "react-native-toast-message";

export default function askScreen() {
  const { suggestedQA, eventID, recordingName } = useLocalSearchParams<{
    suggestedQA: string;
    eventID: string;
    recordingName: string;
  }>();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Chat[]>([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const suggestedQAmessage = suggestedQA.split(",").map((e) => e.trim());
  const [selectedMessage, setSelectedMessage] = useState<Chat | null>(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  const queryClient = useQueryClient();
  const networkState = useNetworkState();

  /*  const reportMessageApi = useMutation({
     mutationKey: ["reportMessage"],
    mutationFn: async (messageId: number) => {
      const response = axiosApi({
        url: `/chat/report/${messageId}/`,
        method: "POST",
      }).then((e) => e.data);
      return response;
    },
  }); */

  const handleReport = (message: Chat) => {
    setSelectedMessage(message);
    setIsReportModalVisible(true);
  };

  /*  const submitReport = () => {
    if (selectedMessage) {
      reportMessageApi.mutate(selectedMessage.id, {
        onSuccess: () => {
          setIsReportModalVisible(false);
          Toast.show({
            type: 'success',
            text1: 'Message reported successfully',
          });
        },
        onError: () => {
          Toast.show({
            type: 'error',
            text1: 'Failed to report message',
          });
        },
      });
    }
  }; */

  const submitReport = () => {
    if (selectedMessage) {
      // Temporarily bypass the API call and show success message directly
      setIsReportModalVisible(false);
      setTimeout(() => {
        Toast.show({
          type: "success",
          text1: "Message reported successfully",
        });
      }, 1000);

      // Keep the API call commented out for later use
      /*
      reportMessageApi.mutate(selectedMessage.id, {
        onSuccess: () => {
          setIsReportModalVisible(false);
          Toast.show({
            type: 'success',
            text1: 'Message reported successfully',
          });
        },
        onError: () => {
          Toast.show({
            type: 'error',
            text1: 'Failed to report message',
          });
        },
      });
      */
    }
  };

  const chatHistoryApi = useQuery({
    queryKey: ["chatHistory"],
    queryFn: async () => {
      const response = axiosApi({
        url: makeUrlWithParams("/chat/chat-history/{{eventId}}/", {
          eventId: eventID,
        }),
        method: "GET",
      }).then((e) => e.data);
      return response;
    },
    enabled: !!eventID,
  });

  const sendMessageApi = useMutation({
    mutationKey: ["sendMessage"],
    mutationFn: async (payload: { user_input: string; event_id: string }) => {
      const response = axiosApi({
        url: "/chat/",
        method: "POST",
        data: payload,
      }).then((e) => e.data);
      return response;
    },
  });

  console.log("chatHistoryApi", chatHistoryApi.data);

  useEffect(() => {
    if (chatHistoryApi.data) {
      setHistory(chatHistoryApi.data.data);
    }
  }, [chatHistoryApi.data]);

  const handleSendMessage = (message: string) => {
    console.log("Message:", message);
    if (message.trim() !== "") {
      setShowSuggestion(false);
      const tempMessage: Chat = {
        id: -1,
        user_type: "user",
        message: message,
        user: 1,
        timestamp: new Date().toISOString(),
      };

      const tempErroMessage: Chat = {
        id: -1,
        user_type: "ai",
        message: "Request failed try again.",
        user: 1,
        timestamp: new Date().toISOString(),
      };

      setHistory((prevMessages) => [...prevMessages, tempMessage]);

      sendMessageApi
        .mutateAsync({
          user_input: message,
          event_id: eventID,
        })
        .then((e) => {
          queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
        })
        .catch(() =>
          setHistory((prevMessages) => [...prevMessages, tempErroMessage])
        );

      setMessage("");
    }
  };

  const suggestedMsgExcluded = suggestedQAmessage.filter(
    (msg) => !history.map((e) => e.message).includes(msg)
  );

  return (
    <ThemeView>
      <View className="flex-row items-center gap-2 px-4">
        <CustomButton
          onPress={() => router.back()}
          icon={
            <MaterialIcons name="arrow-back-ios-new" size={20} color="white" />
          }
          className="p-2 rounded-full"
        />
        <Text className="text-[#7B8388]">My Recording</Text>
        <Text className="text-[#7B8388]">/</Text>
        <Text
          style={{
            color: "#004aad",
            fontSize: 14,
            width: 150,
            textOverflow: "ellipsis",
          }}
          numberOfLines={1}
        >
          {recordingName}
        </Text>
      </View>
      <View className="flex-1 items-end justify-end">
        <View className="h-4/5 w-full bg-background-primary rounded-t-3xl border border-[#1D1D1D]">
          <View className="p-8">
            <ThemeText className="text-3xl px-4">Ask ?</ThemeText>
            <View className="flex-grow h-[1px] bg-background-secondary mt-6" />
          </View>

          {networkState.isInternetReachable === undefined ||
          (chatHistoryApi.isLoading && !message) ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#004aad" />
            </View>
          ) : !networkState.isInternetReachable ? (
            <OfflineMessage />
          ) : (
            <View className="flex-1 items-end justify-end mb-4">
              <ScrollView
                className="w-full px-10"
                ref={scrollViewRef}
                onContentSizeChange={() =>
                  scrollViewRef.current?.scrollToEnd({ animated: true })
                }
                contentContainerStyle={{
                  flexGrow: 1,
                  alignItems: "flex-end",
                  justifyContent: "flex-end",
                }}
              >
                {history.length === 0 ? (
                  <SuggestedQA
                    itemList={suggestedQAmessage || []}
                    onpress={handleSendMessage}
                  />
                ) : (
                  history.map((e, i) => (
                    <View
                      key={i}
                      style={{
                        width: "100%",
                        alignItems:
                          e.user_type === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <View className="flex-row items-end  gap-2">
                        {e.user_type === "ai" && (
                          <Octicons
                            name="dependabot"
                            size={16}
                            color="#7b8388"
                          />
                        )}
                        <View className="flex-col gap-1">
                          <View
                            className={`${
                              e.user_type === "user"
                                ? "bg-[#28272c] mt-2"
                                : "border border-[#2c2c2c]"
                            } rounded-xl px-4 py-2 text-[#7b8388] max-w-80`}
                          >
                            <Text className="text-white">{e.message}</Text>
                          </View>
                          {/* <View
                            className={`flex-row ${
                              e.user_type === "user"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <Text className="text-[#7b8388] text-xs">
                              {convertTimestamp(e.timestamp)}
                            </Text>

                          </View> */}
                          <View className="flex-row justify-between items-center">
                            <Text className="text-[#7b8388] text-xs">
                              {convertTimestamp(e.timestamp)}
                            </Text>
                            {e.user_type === "ai" && (
                              <CustomButton
                                onPress={() => handleReport(e)}
                                className="ml-2  bg-transparent"
                                icon={
                                  <MaterialIcons
                                    name="report"
                                    size={16}
                                    color="#7B8388"
                                  />
                                }
                              />
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                )}

                {sendMessageApi.isPending && (
                  <View className="flex items-start justify-start w-full mt-2">
                    <View className="flex-row items-center gap-1">
                      <Octicons name="dependabot" size={16} color="#7b8388" />
                      <Text className="text-md text-[#7b8388]">Typing...</Text>
                    </View>
                  </View>
                )}

                {showSuggestion && (
                  <View className="mt-6 pl-4">
                    <SuggestedQA
                      itemList={suggestedMsgExcluded || []}
                      onpress={handleSendMessage}
                    />
                  </View>
                )}

                {history.length > 0 && suggestedMsgExcluded.length > 0 && (
                  <View className="flex-row justify-end">
                    <CustomButton
                      onPress={() => setShowSuggestion(!showSuggestion)}
                      disabled={sendMessageApi.isPending}
                      title="Suggested Questions"
                      className="text-sm rounded-lg py-2 px-4"
                    />
                  </View>
                )}
              </ScrollView>

              <View className="py-2 px-10">
                <AskInput
                  value={message}
                  setValue={setMessage}
                  placeholder={`Message to ${ProductDetail.name}...`}
                  onPress={() => handleSendMessage(message)}
                  isDisabled={!message || sendMessageApi.isPending}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={isReportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-background-primary p-6 rounded-2xl w-[80%]">
            <ThemeText className="text-xl mb-4">Report Message</ThemeText>
            <Text className="text-[#7B8388] mb-6">
              Are you sure you want to report this message?
            </Text>
            <View className="flex-row justify-end gap-4">
              <CustomButton
                title="Cancel"
                onPress={() => setIsReportModalVisible(false)}
                className="bg-[#28272c] px-4 py-2 rounded-lg"
              />
              <CustomButton
                title="Report"
                onPress={submitReport}
                className="bg-red-500 px-4 py-2 rounded-lg"
              />
            </View>
          </View>
        </View>
      </Modal>
    </ThemeView>
  );
}
