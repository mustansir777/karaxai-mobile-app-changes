// components/modal/RecordBottomSheet.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
} from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { axiosApi, ProccessAudio } from '@/api/api';
import { Toast } from '@/utils/toast';
import { useNetworkState } from 'expo-network';
import { getFormattedDate } from '@/utils/getFormattedTime';
import { saveRecording } from '@/database/database';
import axios, { CancelTokenSource } from 'axios';
import { UploadRecord } from '@/components/upload/UploadRecord';
import { CustomButton } from '@/components/button/CustomButton';
import { JoinMeetingModal } from './JoinMeetingModal';
import { useCallback } from 'react';

interface RecordBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const axiosWithoutAuth = axios.create();

export const RecordBottomSheet: React.FC<RecordBottomSheetProps> = ({ visible, onClose }) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const networkState = useNetworkState();
  const [showRetry, setShowRetry] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [showJoinMeetingModal, setShowJoinMeetingModal] = useState(false);
  const [botId, setBotId] = useState<string | null>(null);
  const recordUriRef = useRef<string>('');
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  const eventIdRef = useRef('');
  const [eventId, _setEventId] = useState('');
  const [isFetchingRecordingDetails, setIsFetchingRecordingDetails] = useState(false);
  
  const setEventId = (eventId: string) => {
    eventIdRef.current = eventId;
    _setEventId(eventId);
  };
// Within the component, add a new function for handling bot status:
const checkBotStatus = useCallback(
  async (botId: string) => {
    try {
      const response = await axiosApi({
        url: `/meetings/bot/status/${botId}/` as any,
        method: 'GET',
      });
      return response.data;
    } catch (error) {
      console.error('Error checking bot status:', error);
      return null;
    }
  },
  []
);

// Replace the existing botStatusQuery with this:
const botStatusQuery = useQuery({
  queryKey: ['botStatus', botId],
  queryFn: () => {
    if (!botId) return Promise.resolve(null);
    return checkBotStatus(botId);
  },
  enabled: !!botId,
  refetchInterval: botId ? 5000 : false,
});

// Add a separate effect to handle bot status changes
useEffect(() => {
  const data = botStatusQuery.data;
  if (data && data.status_text === 'JOINED') {
    Toast.show('Bot successfully joined the meeting', Toast.SHORT, 'top');
    // Navigate to recording view or meeting view based on your app flow
    router.push(`/recordingview?botId=${botId}`);
    onClose();
  }
}, [botStatusQuery.data, botId, router, onClose]);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
      // Reset states when closing
      setShowUploadSection(false);
      setShowRetry(false);
      setShowJoinMeetingModal(false);
    }
  }, [visible, translateY]);

  const handleStartRecording = () => {
    onClose();
    // Navigate to recording screen
    router.push('/recording');
  };

  const uploadRecordingMutation = useMutation({
    mutationKey: ['uploadRecording'],
    mutationFn: async () => {
      const response = await axiosApi({
        url: '/generate-presigned-url/',
        method: 'POST',
        params: {
          only_pre_signed_url: 1,
        },
      }).then((res) => res.data);
      return response;
    },
  });

  const uploadRecordToS3 = useMutation({
    mutationKey: ['uploadRecordToS3'],
    mutationFn: async (payload: { url: string; file: Blob }) => {
      cancelTokenRef.current = axios.CancelToken.source();
      const response = await axiosWithoutAuth
        .put(payload.url, payload.file, {
          headers: {
            'Content-Type': 'audio/*',
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

  const proccessRecordingMutation = useMutation({
    mutationKey: ['transcribe'],
    mutationFn: async (payload: ProccessAudio) => {
      const response = await axiosApi({
        url: '/process-audio/',
        method: 'POST',
        data: payload,
      }).then((res) => res.data);
      return response;
    },
  });

  const handleProccessRecording = (payload: ProccessAudio) => {
    proccessRecordingMutation
      .mutateAsync(payload)
      .then((e) => {
        if (e.success) {
          setEventId(e.data.event_id);
          setIsFetchingRecordingDetails(true);
          // Close the bottom sheet and navigate to recording view
          onClose();
          router.push(`/recordingview?eventID=${e.data.event_id}`);
        } else {
          Toast.show(e.message, Toast.SHORT, 'top', 'error');
        }
      })
      .catch((e) => {
        Toast.show(
          e.message?.message || 'Processing audio failed',
          Toast.SHORT,
          'top',
          'error'
        );
      });
  };

  const handleUpload = async (uri: string) => {
    try {
      if (!networkState.isConnected) {
        setShowRetry(true);
        return Toast.show(
          'No internet connection',
          Toast.SHORT,
          'top',
          'error'
        );
      }

      setShowRetry(false);

      const date = getFormattedDate();

      const file = {
        uri: uri,
        name: `audio-${date}.m4a`,
        type: 'audio/*',
      };

      uploadRecordingMutation
        .mutateAsync()
        .then((e) => {
          if (e.success) {
            uploadRecordToS3
              .mutateAsync({
                file: file as unknown as Blob,
                url: e.data.url,
              })
              .then(() => {
                Toast.show('Uploaded Successfully!', Toast.SHORT, 'top');
                const date = getFormattedDate();
                handleProccessRecording({
                  file_url: e.data.url,
                  file_path: e.data.file_path,
                  meeting_title: `recording ${date}`,
                });
              })
              .catch((e) => {
                if (axios.isCancel(e)) {
                  Toast.show('Upload canceled', Toast.SHORT, 'top', 'info');
                } else {
                  Toast.show('Upload Failed!', Toast.SHORT, 'top');
                  setShowRetry(true);
                }
              });
          } else {
            Toast.show('Upload Failed!', Toast.SHORT, 'top');
            setShowRetry(true);
          }
        })
        .catch((e) => {
          Toast.show(
            e.message?.message || 'Upload Failed!',
            Toast.SHORT,
            'top'
          );
          setShowRetry(true);
        });
    } catch (error) {
      console.log(error);
    }
  };

  const cancelUpload = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Upload cancelled by the user');
      setEventId('');
      setShowRetry(false);
    }
  };

  const handleSelectedUploadFile = (url: string) => {
    recordUriRef.current = url;
    handleUpload(url);
  };

  const handleImportRecording = () => {
    setShowUploadSection(true);
  };

  const handleJoinMeeting = () => {
    setShowJoinMeetingModal(true);
  };
  
  const handleJoinMeetingSuccess = (newBotId: string) => {
    setBotId(newBotId);
    setShowJoinMeetingModal(true);
    // Show a loading state here or some notification that bot is joining
    Toast.show('Bot is joining the meeting, please wait...', Toast.SHORT, 'top');
  };

  const handleBackdropPress = () => {
    onClose();
  };

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.backdrop}>
            <Animated.View 
              style={[
                styles.bottomSheetContainer,
                { transform: [{ translateY }] }
              ]}
            >
              <View style={styles.handle} />
              
              {uploadRecordingMutation.isPending ||
               proccessRecordingMutation.isPending ||
               uploadRecordToS3.isPending ||
               isFetchingRecordingDetails ||
               botStatusQuery.isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>
                    {uploadRecordingMutation.isPending
                      ? 'Preparing..'
                      : proccessRecordingMutation.isPending
                      ? 'Processing the audio file. please wait...'
                      : isFetchingRecordingDetails
                      ? 'Processing the audio file. please wait...'
                      : uploadRecordToS3.isPending
                      ? 'Uploading your recording...'
                      : botStatusQuery.isLoading && botId
                      ? 'Connecting to meeting. please wait...'
                      : ''}
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
              ) : showUploadSection ? (
                <View style={styles.uploadContainer}>
                  <Text style={styles.title}>Upload Recording</Text>
                  
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
                  
                  <UploadRecord onUpload={handleSelectedUploadFile} />
                  
                  <CustomButton
                    title="Back"
                    onPress={() => setShowUploadSection(false)}
                    type="secondary"
                    className="py-3 w-full mt-4 rounded-lg"
                  />
                  
                  <View style={styles.supportedFormatsContainer}>
                    <Text style={styles.supportedFormatsText}>
                      Supported formats: MP3, M4A only
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.title}>Recording Options</Text>
                  
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleStartRecording}
                  >
                    <View style={styles.blueGradientButton}>
                      <FontAwesome5 name="microphone-alt" size={24} color="white" />
                    </View>
                    <Text style={styles.optionText}>Start Meeting Recording</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleImportRecording}
                  >
                    <View style={styles.optionIconContainer}>
                      <Feather name="upload-cloud" size={24} color="white" />
                    </View>
                    <Text style={styles.optionText}>Upload Meeting Recording</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleJoinMeeting}
                  >
                    <View style={styles.optionIconContainer}>
                      <MaterialCommunityIcons name="account-group" size={24} color="white" />
                    </View>
                    <Text style={styles.optionText}>Join Meeting</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.supportedFormatsContainer}>
                    <Text style={styles.supportedFormatsText}>
                      Supported formats: MP3, M4A only
                    </Text>
                  </View>
                </>
              )}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Join Meeting Modal */}
      <JoinMeetingModal 
        visible={showJoinMeetingModal}
        onClose={() => setShowJoinMeetingModal(false)}
        onSuccess={handleJoinMeetingSuccess}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
    height: 'auto',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#666',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  blueGradientButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#0052D4', // Use a solid color instead of gradient
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    color: 'white',
    flex: 1,
  },
  supportedFormatsContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  supportedFormatsText: {
    fontSize: 12,
    color: '#888',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  uploadContainer: {
    padding: 10,
  },
});