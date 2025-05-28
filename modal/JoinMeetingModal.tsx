// components/modal/JoinMeetingModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { axiosApi, MeetingWithBot } from '@/api/api';
import { useMutation } from '@tanstack/react-query';
import { Toast } from '@/utils/toast';
import useAuthStorage from "@/hooks/useAuthData";

interface JoinMeetingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (botId: string) => void;
}

export const JoinMeetingModal: React.FC<JoinMeetingModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [meetingUrl, setMeetingUrl] = useState('');
  const { userId } = useAuthStorage(); // Get userId from auth context
  
  const joinMeetingMutation = useMutation({
    mutationKey: ['joinMeeting'],
    mutationFn: async (data: MeetingWithBot) => {
      return axiosApi({
        url: '/meetings/create-meeting-with-bot/' as any, // Type assertion to bypass type check
        method: 'POST',
        data,
      }).then((res) => res.data);
    },
    onSuccess: (data) => {
      Toast.show('Successfully joined meeting', Toast.SHORT, 'top');
      onSuccess(data.id);
    },
    onError: (error: any) => {
      Toast.show(
        error.message || 'Failed to join meeting',
        Toast.SHORT,
        'top',
        'error'
      );
    },
  });

  const handleSubmit = () => {
    if (!meetingUrl) {
      Toast.show('Please enter a meeting URL', Toast.SHORT, 'top', 'error');
      return;
    }

    // Check if it's a valid Google Meet URL
    if (!meetingUrl.includes('meet.google.com')) {
      Toast.show('Please enter a valid Google Meet URL', Toast.SHORT, 'top', 'error');
      return;
    }

    joinMeetingMutation.mutate({ 
      meeting_url: meetingUrl,
      meeting_title: `Meeting ${new Date().toLocaleString()}`,
      user_id: Number(userId) // Convert string userId to number
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Paste Meeting URL</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Meeting Link</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter meeting link"
              placeholderTextColor="#666"
              value={meetingUrl}
              onChangeText={setMeetingUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={joinMeetingMutation.isPending}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={joinMeetingMutation.isPending}
            >
              {joinMeetingMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Save Meeting</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    width: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: 'white',
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 16,
    color: 'white',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    minWidth: 120,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});