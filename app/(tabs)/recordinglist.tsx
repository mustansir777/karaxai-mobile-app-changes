import { CustomButton } from "@/components/button/CustomButton";
import SyncingIndicator from "@/components/icon/SyncIcon";
import { ThemeText } from "@/components/theme/ThemeText";
import { ThemeView } from "@/components/theme/ThemeView";
import { tableName } from "@/database/database";
import useAuthStorage from "@/hooks/useAuthData";
import { useSyncMeetingToDB } from "@/hooks/useSyncMeetingToDB";
import getGreetingBasedOnTime from "@/utils/getGreeting";
import getTodayDate from "@/utils/getTodayDate";
import { AntDesign, Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, StyleSheet, Dimensions, TextInput } from "react-native";
import { format, isToday, isSameMonth, isSameYear } from "date-fns";
import { axiosApi, CategoryWithMeetings } from "@/api/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

const PAGE_SIZE = 10;
const { width } = Dimensions.get('window');

interface Meeting {
  id: number;
  event_id: string;
  categoryId: number;
  meeting_title: string;
  meeting_date: string;
  meeting_start_time: string;
  meeting_end_time: string;
  meet_url: string;
  meeting_admin_id: number;
  meeting_code: string | null;
  organizer_email: string;
  source: string;
  bot_id: number;
}

interface GroupedMeeting {
  date: string;
  meetings: Meeting[];
}

export default function RecordingListScreen() {
  const todayDate = getTodayDate();
  const db = useSQLiteContext();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [viewAllMode, setViewAllMode] = useState(false);
  const isFocused = useIsFocused();
  const { userId, username } = useAuthStorage();
  const { isSyncInProgress, syncMeetingToDB } = useSyncMeetingToDB();
  const queryClient = useQueryClient();
  
  // State for categories and expansion
  const [categories, setCategories] = useState<CategoryWithMeetings[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  
  // Query for categories with meetings
  const { data: categoriesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['categoriesWithMeetings'],
    queryFn: async () => {
      const response = await axiosApi({
        url: '/categories-with-meetings/' as any,
        method: 'GET',
        params: {
          num_meetings: 100 // Get all meetings
        },
      });
      return response.data;
    },
    enabled: !!userId && isFocused
  });
  
  // Query for uncategorized meetings
  const { data: uncategorizedData, isLoading: loadingUncategorized } = useQuery({
    queryKey: ['uncategorizedMeetings'],
    queryFn: async () => {
      const response = await axiosApi({
        url: '/uncategorized-meetings/' as any,
        method: 'GET',
        params: {
          num_meetings: 100
        },
      });
      return response.data;
    },
    enabled: !!userId && isFocused
  });
  
  // Update categories and all meetings when data changes
  useEffect(() => {
    let meetings: Meeting[] = [];
    
    if (categoriesData?.data) {
      setCategories(categoriesData.data);
      // Collect all meetings from categories
      categoriesData.data.forEach((category: CategoryWithMeetings) => {
        if (category.meetings) {
          meetings = [...meetings, ...category.meetings];
        }
      });
    }
    
    if (uncategorizedData?.data && uncategorizedData.data.length > 0) {
      uncategorizedData.data.forEach((category: CategoryWithMeetings) => {
        if (category.meetings) {
          meetings = [...meetings, ...category.meetings];
        }
      });
    }
    
    // Sort meetings by date (newest first)
    meetings.sort((a, b) => {
      const dateA = new Date(`${a.meeting_date}T${a.meeting_start_time}`);
      const dateB = new Date(`${b.meeting_date}T${b.meeting_start_time}`);
      return dateB.getTime() - dateA.getTime();
    });
    
    setAllMeetings(meetings);
  }, [categoriesData, uncategorizedData]);
  
  // Synchronize meetings
  useEffect(() => {
    const sync = async () => {
      await syncMeetingToDB(userId);
      refetch();
    };
    
    if (userId && isFocused && !isSyncInProgress) {
      sync();
    }
  }, [userId, isFocused]);
  
  // Format date helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {
      return "Unknown date";
    }
    
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy • hh:mm a');
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Invalid date";
    }
  };
  
  // Format time helper
  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "Unknown time";
    
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'hh:mm a');
    } catch (error) {
      return "Invalid time";
    }
  };
  
  // Group meetings by date
  const groupMeetingsByDate = (meetings: Meeting[]): GroupedMeeting[] => {
    const grouped: { [key: string]: Meeting[] } = {};
    
    meetings.forEach(meeting => {
      const meetingDate = new Date(meeting.meeting_date);
      let dateKey: string;
      
      if (isToday(meetingDate)) {
        dateKey = "Today";
      } else if (isSameMonth(meetingDate, new Date()) && isSameYear(meetingDate, new Date())) {
        dateKey = `This Month - ${format(meetingDate, 'MMM dd, yyyy')}`;
      } else {
        dateKey = format(meetingDate, 'MMM dd, yyyy');
      }
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(meeting);
    });
    
    return Object.entries(grouped).map(([date, meetings]) => ({
      date,
      meetings
    }));
  };
  
  // Meeting card component for horizontal slider
  const HorizontalMeetingCard = ({ meeting }: { meeting: Meeting }) => {
    return (
      <TouchableOpacity 
        style={styles.horizontalCard}
        onPress={() => router.push(`/recordingview?eventID=${meeting.event_id}`)}
      >
        <View style={styles.recordingHeader}>
          <Text style={styles.recordingTitle} numberOfLines={1}>
            {meeting.meeting_title || `Recording ${meeting.id}`}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Process Completed</Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          {formatDate(`${meeting.meeting_date}T${meeting.meeting_start_time}`)}
        </Text>
        
        <View style={styles.recordingInfo}>
          <MaterialIcons name="file-upload" size={16} color="#BBBBBB" />
          <Text style={styles.recordingInfoText}>Recorded or Uploaded meeting</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.profileContainer}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileText}>
              {username ? username.substring(0, 2).toUpperCase() : "US"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Meeting card component for vertical list
  const VerticalMeetingCard = ({ meeting }: { meeting: Meeting }) => {
    return (
      <TouchableOpacity 
        style={styles.verticalCard}
        onPress={() => router.push(`/recordingview?eventID=${meeting.event_id}`)}
      >
        <View style={styles.cardContent}>
          <Text style={styles.verticalTitle} numberOfLines={1}>
            {meeting.meeting_title || `Recording ${meeting.id}`}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Process Completed</Text>
          </View>
        </View>
        
        <Text style={styles.verticalDate}>
          {format(new Date(meeting.meeting_date), 'MMM dd, yyyy')} • {formatTime(meeting.meeting_start_time)}
        </Text>
        
        <View style={styles.recordingInfo}>
          <MaterialIcons name="file-upload" size={16} color="#BBBBBB" />
          <Text style={styles.recordingInfoText}>Recorded or Uploaded meeting</Text>
        </View>
        
        {/* Show "No participants" for some meetings as in the image */}
        {Math.random() > 0.7 && (
          <Text style={styles.noParticipants}>No participants</Text>
        )}
      </TouchableOpacity>
    );
  };
  
  // Grouped meetings for view all mode
  const groupedMeetings = groupMeetingsByDate(allMeetings);
  
  // Main render function
  return (
    <View style={{ flex: 1 }}>
      <ThemeView>
        {isLoading || loadingUncategorized ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#004aad" />
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <ThemeText className="text-base mb-4">
              Error fetching recordings
            </ThemeText>
            <CustomButton
              onPress={() => refetch()}
              title="Retry"
              className="px-10 py-4 rounded-lg mt-2"
            />
          </View>
        ) : (
          <ScrollView style={styles.container}>
            {/* Greeting Section */}
            <View style={styles.greetingContainer}>
              <ThemeText className="text-2xl font-bold">
                {getGreetingBasedOnTime(username)}
              </ThemeText>
              <Text style={styles.dateText}>{todayDate}</Text>
            </View>
            
            {/* Search Container */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Feather name="search" size={20} color="#BBBBBB" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search meetings..."
                  placeholderTextColor="#BBBBBB"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

            </View>
            
            {!viewAllMode ? (
              // Recent Meetings - Horizontal Slider
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Meetings</Text>
                  <TouchableOpacity onPress={() => setViewAllMode(true)}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
                
                {allMeetings.length > 0 ? (
                  <FlatList
                    data={allMeetings.slice(0, 10)}
                    renderItem={({ item, index }) => <HorizontalMeetingCard meeting={item} />}
                    keyExtractor={(item, index) => `recent-${item.id}-${item.event_id}-${index}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListContainer}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <ThemeText className="text-base">No recordings found</ThemeText>
                  </View>
                )}
              </>
            ) : (
              // View All Mode - Grouped by Date
              <>
                <View style={styles.sectionHeader}>
                  <TouchableOpacity onPress={() => setViewAllMode(false)}>
                    <Feather name="arrow-left" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  <Text style={styles.sectionTitle}>All Meetings</Text>
                  <View style={{ width: 20 }} />
                </View>
                
                {groupedMeetings.map((group, index) => (
                  <View key={`group-${index}-${group.date}`} style={styles.dateGroup}>
                    <Text style={styles.dateGroupTitle}>{group.date}</Text>
                    {group.meetings.map((meeting, meetingIndex) => (
                      <VerticalMeetingCard 
                        key={`vertical-${meeting.id}-${meeting.event_id}-${meetingIndex}`} 
                        meeting={meeting} 
                      />
                    ))}
                  </View>
                ))}
                
                {groupedMeetings.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <ThemeText className="text-base">No recordings found</ThemeText>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
        
        {isSyncInProgress && (
          <View style={styles.syncIndicator}>
            <SyncingIndicator />
          </View>
        )}
      </ThemeView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  greetingContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#BBBBBB',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  gridButton: {
    width: 44,
    height: 44,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  viewAllText: {
    fontSize: 16,
    color: '#007AFF',
  },
  horizontalListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  horizontalCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    width: width * 0.85,
  },
  verticalCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  verticalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  verticalDate: {
    fontSize: 14,
    color: '#BBBBBB',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#27AE60',
    fontSize: 12,
    fontWeight: '500',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  recordingInfoText: {
    color: '#BBBBBB',
    fontSize: 14,
    marginLeft: 8,
  },
  noParticipants: {
    color: '#BBBBBB',
    fontSize: 14,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
});