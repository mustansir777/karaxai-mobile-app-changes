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
import { format } from "date-fns";
import { axiosApi, CategoryWithMeetings } from "@/api/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

const PAGE_SIZE = 10; // Number of items per page
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

export default function FolderScreen() {
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
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryWithMeetings[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  // Query for categories with meetings
  const { data: categoriesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['categoriesWithMeetings'],
    queryFn: async () => {
      const response = await axiosApi({
        url: '/categories-with-meetings/' as any,
        method: 'GET',
        params: {
          num_meetings: 5 // Initial limit for each category
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
          num_meetings: 5 // Initial limit
        },
      });
      return response.data;
    },
    enabled: !!userId && isFocused
  });
  
  // Update categories when data changes
  useEffect(() => {
    if (categoriesData?.data) {
      setCategories(categoriesData.data);
    }
  }, [categoriesData]);
  
  useEffect(() => {
    // Add uncategorized meetings to categories if available
    if (uncategorizedData?.data && uncategorizedData.data.length > 0) {
      setCategories(prevCategories => {
        // Check if uncategorized category already exists
        const uncategorizedExists = prevCategories.some(
          cat => cat.category.name.toLowerCase() === 'default'
        );
        
        if (uncategorizedExists) {
          return prevCategories;
        }
        
        // Add uncategorized data to categories
        return [...prevCategories, ...uncategorizedData.data];
      });
    }
  }, [uncategorizedData]);
  
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
  
  // Toggle category expansion
  const toggleCategoryExpansion = (index: number) => {
    setExpandedCategories(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };
  
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
  
  // Meeting card component
  const MeetingCard = ({ meeting }: { meeting: Meeting }) => {
    return (
      <TouchableOpacity 
        style={styles.recordingCard}
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
  
  // Category List component
  const CategoryList = ({ 
    category, 
    index 
  }: { 
    category: CategoryWithMeetings, 
    index: number 
  }) => {
    const [meetings, setMeetings] = useState<Meeting[]>(category.meetings || []);
    const [loadingMeetings, setLoadingMeetings] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const isExpanded = expandedCategories.includes(index);
    
    // Load all meetings for this category
    const loadAllMeetings = async () => {
      try {
        setLoadingMeetings(true);
        let response;
        
        if (category.category.name.toLowerCase() === "default") {
          response = await axiosApi({
            url: "/uncategorized-meetings/" as any,
            method: "GET",
            params: {
              num_meetings: category.total_meetings ?? 100,
            },
          });
        } else {
          response = await axiosApi({
            url: "/categories-with-meetings/" as any,
            method: "GET",
            params: {
              category_id: String(category.category_id),
              num_meetings: category.total_meetings ?? 100,
            },
          });
        }

        if (response?.data?.data?.[0]?.meetings) {
          setMeetings(response.data.data[0].meetings);
          setShowAll(true);
        }
      } catch (error) {
        console.error("Error loading meetings:", error);
      } finally {
        setLoadingMeetings(false);
      }
    };
    
    // Reset meetings when category is collapsed
    useEffect(() => {
      if (!isExpanded) {
        setMeetings(category.meetings || []);
        setShowAll(false);
        setLoadingMeetings(false);
      }
    }, [isExpanded, category.meetings]);
    
    // Determine displayed meetings
    const displayedMeetings = showAll ? meetings : meetings.slice(0, 5);
    
    if (!isExpanded) return null;
    
    return (
      <View style={styles.categoryContent}>
        {displayedMeetings.map((meeting, idx) => (
          <MeetingCard key={`meeting-${meeting.id}-${idx}`} meeting={meeting} />
        ))}
        
        {loadingMeetings && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#004aad" />
          </View>
        )}
        
        {category.total_meetings > 5 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => {
              if (showAll) {
                setShowAll(false);
                setMeetings(category.meetings || []);
              } else {
                loadAllMeetings();
              }
            }}
            disabled={loadingMeetings}
          >
            <Text style={styles.viewAllText}>
              {showAll 
                ? "Show Less" 
                : `View All Meetings (${category.total_meetings})`
              }
            </Text>
            {showAll 
              ? <Feather name="chevron-up" size={16} color="#007AFF" />
              : <Feather name="chevron-right" size={16} color="#007AFF" />
            }
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
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
            <View style={styles.greetingContainer}>
              <ThemeText className="text-2xl font-bold">
                {getGreetingBasedOnTime(username)}
              </ThemeText>
              <Text style={styles.dateText}>{todayDate}</Text>
            </View>
            
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
            
            {/* Recent Recordings section - horizontal scrolling */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Folders</Text>
              <TouchableOpacity onPress={() => setViewAllMode(!viewAllMode)}>
                <Text style={styles.viewAllText}>
                  {viewAllMode ? "Show Less" : "View All"}
                </Text>
              </TouchableOpacity>
            </View>
            
            {!viewAllMode && categories.length > 0 && categories[0]?.meetings?.length > 0 && (
              <FlatList
                data={categories[0].meetings.slice(0, 5)}
                renderItem={({ item }) => (
                  <View style={{ width: width * 0.85, marginRight: 16 }}>
                    <MeetingCard meeting={item} />
                  </View>
                )}
                keyExtractor={(item) => `recent-${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListContainer}
              />
            )}
            
            {/* Categories list - expanded in "View All" mode */}
            {categories.length > 0 && (viewAllMode || categories.length > 1) && (
              <View style={{ marginTop: 20 }}>
                {categories.map((category, index) => (
                  <View key={`category-${category.category_id}-${index}`} style={styles.categoryContainer}>
                    <TouchableOpacity
                      style={styles.categoryHeader}
                      onPress={() => toggleCategoryExpansion(index)}
                    >
                      <Text style={styles.categoryTitle}>
                        {category.category.name === 'default' ? 'Uncategorized' : category.category.name}
                        {category.total_meetings > 0 && ` (${category.total_meetings})`}
                      </Text>
                      <Feather 
                        name={expandedCategories.includes(index) ? "chevron-down" : "chevron-right"} 
                        size={20} 
                        color="white" 
                      />
                    </TouchableOpacity>
                    
                    {expandedCategories.includes(index) && (
                      <CategoryList category={category} index={index} />
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {categories.length === 0 && (
              <View style={styles.emptyContainer}>
                <ThemeText className="text-base">No recordings found</ThemeText>
              </View>
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
  recordingCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  recordingHeader: {
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
  categoryContainer: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  categoryContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
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