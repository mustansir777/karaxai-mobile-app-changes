import { CustomButton } from "@/components/button/CustomButton";
import Recorder from "@/components/recorder/Recorder";
import { ThemeView } from "@/components/theme/ThemeView";
import { ActivityIndicator, Animated, Text, View } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRecording } from "@/hooks/useRecording";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { axiosApi, ProccessAudio } from "@/api/api";
import { Toast } from "@/utils/toast";
import { useNetworkState } from "expo-network";
import { router } from "expo-router";
import { getFormattedDate } from "@/utils/getFormattedTime";
import { saveRecording } from "@/database/database";
import { RecordingDetails } from "@/constants/RecordingDetails";
import { makeUrlWithParams } from "@/utils/makeUrlWithParam";
import ResumeIcon from "@/components/icon/ResumeIcon";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { UploadRecord } from "@/components/upload/UploadRecord";
import axios, { CancelTokenSource } from "axios";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome from "@expo/vector-icons/FontAwesome";

const axiosWithoutAuth = axios.create();

export default function RecordingScreen() {
  const networkState = useNetworkState();
  const [showRetry, setShowRetry] = useState(false);
  const recordUriRef = useRef<string>("");
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    formattedDuration,
    isPaused,
    isInitializing,
    isRecordingStopping,
  } = useRecording({ scaleAnim: scaleAnim });

  const [isFectingRecordingDetails, setIsFectingRecordingDetails] =
    useState(false);

  const eventIdRef = useRef("");
  const [eventId, _setEventId] = useState("");
  const setEventId = (eventId: string) => {
    eventIdRef.current = eventId;
    _setEventId(eventId);
  };

  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  const proccessRecordingMutation = useMutation({
    mutationKey: ["transcribe"],
    mutationFn: async (payload: ProccessAudio) => {
      const response = await axiosApi({
        url: "/process-audio/",
        method: "POST",
        data: payload,
      }).then((res) => res.data);
      return response;
    },
  });

  const uploadRecordingMutation = useMutation({
    mutationKey: ["uploadRecording"],
    mutationFn: async () => {
      const response = await axiosApi({
        url: "/generate-presigned-url/",
        method: "POST",
        params: {
          only_pre_signed_url: 1,
        },
      }).then((res) => res.data);
      return response;
    },
  });

  const uploadRecordToS3 = useMutation({
    mutationKey: ["uploadRecordToS3"],
    mutationFn: async (payload: { url: string; file: Blob }) => {
      cancelTokenRef.current = axios.CancelToken.source();
      const response = await axiosWithoutAuth
        .put(payload.url, payload.file, {
          headers: {
            "Content-Type": "audio/*",
          },
          cancelToken: cancelTokenRef.current.token,
          transformRequest: (data) => {
            return data;
          },
        })
        .then((res) => res.data);
      return response;
    },
  });

  const recordingDetailsViewApi = useQuery({
    queryKey: ["meetingView", eventId],
    queryFn: async () => {
      const eventID = eventIdRef.current;
      return await axiosApi({
        url: makeUrlWithParams("/meeting-view/{{eventId}}/", {
          eventId: eventID,
        }),
        method: "GET",
      })
        .then((e) => e.data)
        .then((e) => {
          if (
            (e.trascription_status == "success" ||
              e.trascription_status == "failed") &&
            (e.error_message || e.summary)
          ) {
            const date = new Date()
              .toISOString()
              .replace("T", " ")
              .slice(0, 19);
            console.log(date);
            saveRecording(e, eventID, date).then(() => {
              router.push(`/recordingview?eventID=${eventID}`);
              setEventId("");
              setIsFectingRecordingDetails(false);
            });
          }
          return e;
        })
        .catch((e) => {
          Toast.show(
            e.message?.message || "Error getting recording details",
            Toast.SHORT,
            "top",
            "error"
          );
          setIsFectingRecordingDetails(false);
          setEventId("");
          return e;
        });
    },
    enabled: !!eventId,
    refetchInterval: 5000,
  });

  const cancelUpload = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel("Upload cancelled by the user");
      setEventId("");
      setShowRetry(false);
    }
  };

  const handleProccessRecording = (payload: ProccessAudio) => {
    proccessRecordingMutation
      .mutateAsync(payload)
      .then((e) => {
        console.log(e);
        if (e.success) {
          // Toast.show(
          //   "File uploaded successfully.",
          //   Toast.SHORT,
          //   "top",
          //   "success"
          // );
          setEventId(e.data.event_id);
          setIsFectingRecordingDetails(true);
        } else {
          Toast.show(e.message, Toast.SHORT, "top", "error");
        }
      })
      .catch((e) => {
        Toast.show(
          e.message?.message || "Proccessing audio failed",
          Toast.SHORT,
          "top",
          "error"
        );
      });
  };

  const handleUpload = async (uri: string) => {
    try {
      if (!networkState.isConnected) {
        setShowRetry(true);
        return Toast.show(
          "No internet connection",
          Toast.SHORT,
          "top",
          "error"
        );
      }

      setShowRetry(false);

      const date = getFormattedDate();

      const file = {
        uri: uri,
        name: `audio-${date}.m4a`,
        type: "audio/*",
      };

      uploadRecordingMutation
        .mutateAsync()
        .then((e) => {
          console.log(e);
          if (e.success) {
            uploadRecordToS3
              .mutateAsync({
                file: file as unknown as Blob,
                url: e.data.url,
              })
              .then(() => {
                Toast.show("Uploaded Successfully!", Toast.SHORT, "top");
                const date = getFormattedDate();
                handleProccessRecording({
                  file_url: e.data.url,
                  file_path: e.data.file_path,
                  meeting_title: `recording ${date}`,
                });
              })
              .catch((e) => {
                if (axios.isCancel(e)) {
                  Toast.show("Upload canceled", Toast.SHORT, "top", "info");
                } else {
                  Toast.show("Upload Failed!", Toast.SHORT, "top");
                  setShowRetry(true);
                }
              });
          } else {
            Toast.show("Upload Failed!", Toast.SHORT, "top");
            setShowRetry(true);
          }
        })
        .catch((e) => {
          Toast.show(
            e.message?.message || "Upload Failed!",
            Toast.SHORT,
            "top"
          );
          setShowRetry(true);
        });
    } catch (error) {
      console.log(error);
    }
  };

  const handleStopRecording = async () => {
    const url = await stopRecording();
    if (url) {
      recordUriRef.current = url;
      handleUpload(url);
    }
  };

  const handleStartRecording = async () => {
    setShowRetry(false);
    await startRecording();
  };

  // const saveDummpyRecording = () => {
  //   saveRecording(RecordingDetails, "78d79690-b854-4f6a-a02b-1dba02cd73ac");
  // };

  useEffect(() => {
    const enableKeepAwake = async () => {
      await activateKeepAwakeAsync();
    };
    if (isRecording) {
      enableKeepAwake();
    } else {
      deactivateKeepAwake();
    }
  }, [isRecording]);

  // console.log("isRecording", isRecording);
  const handleSelectedUploadFile = (url: string) => {
    recordUriRef.current = url;
    handleUpload(url);
  };

  return (
    <ThemeView>
      {uploadRecordingMutation.isPending ||
      proccessRecordingMutation.isPending ||
      uploadRecordToS3.isPending ||
      isFectingRecordingDetails ? (
        <View className="flex-1 items-center justify-center px-12">
          <View className="bg-[#0F0F0F] rounded-xl p-12">
            <Text
              className="text-center text-xl text-white mb-4"
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {uploadRecordingMutation.isPending
                ? "Preparing.."
                : proccessRecordingMutation.isPending
                ? "Processing the audio file. please wait..."
                : isFectingRecordingDetails
                ? "Processing the audio file. please wait..."
                : uploadRecordToS3.isPending
                ? "Uploading your recording..."
                : ""}
            </Text>
            <ActivityIndicator size="large" color="#004aad" />

            {uploadRecordToS3.isPending && (
              <CustomButton
                onPress={cancelUpload}
                type="secondary"
                className="px-4 py-2 rounded-lg mt-4"
                title="Cancel upload"
              />
            )}
          </View>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-12">
          <Recorder scaleAnim={scaleAnim} />

          {isRecording && (
            <View className="flex-row items-center justify-between gap-10 mb-12">
              <CustomButton
                onPress={isPaused ? resumeRecording : pauseRecording}
                type="primary"
                className="h-16 w-16 rounded-full"
                icon={
                  isPaused ? (
                    <Entypo name="controller-play" size={24} color="white" />
                  ) : (
                    <FontAwesome6 name="pause" size={24} color="white" />
                  )
                }
              />
              <Text className="text-[#BBBBBB] text-lg">
                {formattedDuration}
              </Text>
              <CustomButton
                onPress={handleStopRecording}
                type="primary"
                className="h-16 w-16 rounded-full"
                icon={<FontAwesome name="stop" size={24} color="red" />}
              />
            </View>
          )}

          {showRetry && (
            <CustomButton
              title="Retry Upload"
              disabled={uploadRecordingMutation.isPending}
              onPress={async () => {
                await handleUpload(recordUriRef.current);
              }}
              type="primary"
              className="py-3 w-full mb-4 rounded-lg bg-red-600 text-white"
            />
          )}

          {!isRecording && (
            <CustomButton
              title={
                showRetry
                  ? "Start new recording"
                  : isRecordingStopping
                  ? "Stopping Recording..."
                  : isInitializing
                  ? "Initializing..."
                  : "Start Meeting Recording"
              }
              onPress={handleStartRecording}
              disabled={isInitializing || isRecordingStopping}
              type={isRecording ? "primary" : "secondary"}
              className={`py-3 w-full  rounded-lg  bg-red-600 ${
                isRecording ? "mb-14" : "mb-4"
              }`}
            />
          )}

          {!isRecording && (
            <View className="mb-10 w-full">
              <UploadRecord onUpload={handleSelectedUploadFile} />
            </View>
          )}

          {/* <CustomButton
            onPress={saveDummpyRecording}
            type="secondary"
            className="p-4 rounded-full"
            title="Save Dummy Recording"
          /> */}
        </View>
      )}
    </ThemeView>
  );
}
