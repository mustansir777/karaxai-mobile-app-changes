import { ThemeView } from "@/components/theme/ThemeView";
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { ThemeText } from "@/components/theme/ThemeText";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { axiosApi } from "@/api/api";
import FontAwesome from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  
  // Generate an array of dates for the current week
  const getWeekDates = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    const dates = [];
    for (let i = -day; i < 7-day; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  
  const weekDates = getWeekDates();
  
  // Format date to display
  const formatDate = (date: Date) => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dayIndex = date.getDay();
    return {
      day: days[dayIndex],
      date: date.getDate(),
      full: date.toISOString().split('T')[0], // YYYY-MM-DD
      isToday: new Date().toDateString() === date.toDateString()
    };
  };
  
  // Query for calendar events
  const calendarEventsQuery = useQuery({
    queryKey: ["calendarEvents", selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      try {
        // Replace with actual API endpoint
        const response = await axiosApi({
          url: "getCalendarEvents",
          method: "GET",
          params: {
            date: selectedDate.toISOString().split('T')[0]
          }
        });
        return response.data || [];
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
        // For demo purposes, return some demo events
        return [
          {
            id: '1',
            title: 'Team Standup',
            time: '09:00 AM',
            duration: 30,
            participants: 5
          },
          {
            id: '2',
            title: 'Product Review',
            time: '11:30 AM',
            duration: 60,
            participants: 8
          },
          {
            id: '3',
            title: 'Client Meeting',
            time: '02:00 PM',
            duration: 45,
            participants: 3
          }
        ];
      }
    },
  });
  
  // Function to handle joining a meeting
  const handleJoinMeeting = (meetingId) => {
    console.log('Joining meeting:', meetingId);
    // Implementation to join meeting
  };

  return (
    <ThemeView>
      <ScrollView className="flex-1 p-4">
        <ThemeText className="text-2xl font-bold mb-4">Calendar</ThemeText>
        
        {/* Calendar view selector */}
        <View className="flex-row mb-6 bg-[#1A1A1A] rounded-lg overflow-hidden">
          <TouchableOpacity
            className={`flex-1 py-2 px-4 ${viewMode === 'week' ? 'bg-[#004aad]' : 'bg-transparent'}`}
            onPress={() => setViewMode('week')}
          >
            <Text className={`text-center ${viewMode === 'week' ? 'text-white' : 'text-[#BBBBBB]'}`}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-4 ${viewMode === 'month' ? 'bg-[#004aad]' : 'bg-transparent'}`}
            onPress={() => setViewMode('month')}
          >
            <Text className={`text-center ${viewMode === 'month' ? 'text-white' : 'text-[#BBBBBB]'}`}>
              Month
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Week view */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="mb-6"
        >
          {weekDates.map((date) => {
            const { day, date: dateNum, full, isToday } = formatDate(date);
            return (
              <TouchableOpacity
                key={full}
                className={`mr-4 items-center justify-center w-12 h-16 rounded-lg ${
                  selectedDate.toDateString() === date.toDateString()
                    ? 'bg-[#004aad]'
                    : isToday
                    ? 'bg-[#333333]'
                    : 'bg-[#1A1A1A]'
                }`}
                onPress={() => setSelectedDate(date)}
              >
                <Text className={`text-xs ${selectedDate.toDateString() === date.toDateString() ? 'text-white' : 'text-[#BBBBBB]'}`}>
                  {day}
                </Text>
                <Text className={`text-lg font-medium ${selectedDate.toDateString() === date.toDateString() ? 'text-white' : 'text-[#BBBBBB]'}`}>
                  {dateNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        {/* Selected date */}
        <View className="flex-row items-center justify-between mb-4">
          <ThemeText className="text-lg font-semibold">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </ThemeText>
          <TouchableOpacity className="bg-[#1A1A1A] rounded-full p-2">
            <Ionicons name="add" size={22} color="#BBBBBB" />
          </TouchableOpacity>
        </View>
        
        {/* Events for selected date */}
        {calendarEventsQuery.isLoading ? (
          <ActivityIndicator size="large" color="#004aad" className="my-8" />
        ) : calendarEventsQuery.data?.length === 0 ? (
          <View className="items-center justify-center py-12 bg-[#1A1A1A] rounded-xl">
            <Ionicons name="calendar-outline" size={48} color="#929292" />
            <Text className="text-[#929292] text-center mt-4">
              No meetings scheduled for today
            </Text>
          </View>
        ) : (
          calendarEventsQuery.data?.map((event) => (
            <View 
              key={event.id}
              className="mb-4 bg-[#1A1A1A] rounded-xl p-4"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-medium text-lg">{event.title}</Text>
                <TouchableOpacity
                  className="bg-[#004aad] px-3 py-1 rounded-lg"
                  onPress={() => handleJoinMeeting(event.id)}
                >
                  <Text className="text-white text-xs">Join</Text>
                </TouchableOpacity>
              </View>
              
              <View className="flex-row items-center">
                <FontAwesome name="clock" size={14} color="#BBBBBB" />
                <Text className="text-[#BBBBBB] ml-2">{event.time} • {event.duration} min</Text>
              </View>
              
              <View className="flex-row items-center mt-1">
                <FontAwesome name="users" size={14} color="#BBBBBB" />
                <Text className="text-[#BBBBBB] ml-2">{event.participants} participants</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ThemeView>
  );
}