// File: app/(hospital)/requests.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/IconSymbol";
import apiClient from "../../api/apiClient";

interface HospitalRequest {
  id: number;
  patient_name: string;
  reason_for_visit: string;
  patient_latitude: number;
  patient_longitude: number;
  hospital_name: string;
  ai_reasoning: string;
  urgency_score: number; // ADD THIS LINE
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  updated_at: string;
}

export default function HospitalRequestsScreen() {
  const [requests, setRequests] = useState<HospitalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequests, setProcessingRequests] = useState<Set<number>>(
    new Set()
  );

  // Fetch requests data
  const fetchRequests = async () => {
    try {
      const response = await apiClient.get("/hospital/requests/");
      setRequests(response.data);
      console.log("Hospital requests loaded:", response.data);
    } catch (error) {
      console.error("Failed to fetch hospital requests:", error);
      Alert.alert("Error", "Failed to load patient requests");
    }
  };

  // Load data on screen focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRequests().finally(() => setLoading(false));
    }, [])
  );

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  // Accept a patient request
  const acceptRequest = async (requestId: number, patientName: string) => {
    Alert.alert(
      "Accept Patient Request",
      `Accept ${patientName}'s request and add them to your patient queue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            setProcessingRequests((prev) => new Set(prev).add(requestId));

            try {
              const response = await apiClient.post(
                `/hospital/requests/${requestId}/accept/`
              );

              Alert.alert(
                "Request Accepted",
                `${patientName} has been added to your patient queue.`,
                [{ text: "OK" }]
              );

              // Refresh the requests list
              await fetchRequests();

              console.log("Request accepted:", response.data);
            } catch (error: any) {
              console.error("Failed to accept request:", error);

              let errorMessage =
                "Failed to accept patient request. Please try again.";
              if (error.response?.status === 400) {
                errorMessage =
                  "Patient is already in the queue or request is no longer valid.";
              }

              Alert.alert("Error", errorMessage);
            } finally {
              setProcessingRequests((prev) => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  // Reject a patient request
  const rejectRequest = async (requestId: number, patientName: string) => {
    Alert.alert(
      "Reject Patient Request",
      `Reject ${patientName}'s request? They will be notified and can try other hospitals.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setProcessingRequests((prev) => new Set(prev).add(requestId));

            try {
              await apiClient.post(`/hospital/requests/${requestId}/reject/`);

              Alert.alert(
                "Request Rejected",
                `${patientName}'s request has been rejected.`,
                [{ text: "OK" }]
              );

              // Refresh the requests list
              await fetchRequests();
            } catch (error) {
              console.error("Failed to reject request:", error);
              Alert.alert(
                "Error",
                "Failed to reject patient request. Please try again."
              );
            } finally {
              setProcessingRequests((prev) => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  // Format time display
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Get urgency color based on AI reasoning
  // Fix the urgency indicator to use actual score instead of keywords
  const getUrgencyIndicator = (urgencyScore: number) => {
    if (urgencyScore >= 7) {
      return { color: "#dc2626", label: "Urgent" };
    }
    if (urgencyScore >= 4) {
      return { color: "#f59e0b", label: "Moderate" };
    }
    return { color: "#16a34a", label: "Routine" };
  };

  // Render request item
  const renderRequestItem = ({ item }: { item: HospitalRequest }) => {
    const isProcessing = processingRequests.has(item.id);
    const urgency = getUrgencyIndicator(item.urgency_score || 5);
    const timeAgo = formatTime(item.created_at);

    return (
      <View style={styles.requestItem}>
        <View style={styles.requestHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patient_name}</Text>
            <Text style={styles.requestTime}>{timeAgo}</Text>
          </View>

          <View
            style={[
              styles.urgencyBadge,
              { backgroundColor: `${urgency.color}20` },
            ]}
          >
            <Text style={[styles.urgencyText, { color: urgency.color }]}>
              {urgency.label}
            </Text>
          </View>
        </View>

        <View style={styles.requestContent}>
          <Text style={styles.sectionLabel}>Reason for Visit:</Text>
          <Text style={styles.reasonText}>{item.reason_for_visit}</Text>
        </View>

        <View style={styles.requestContent}>
          <Text style={styles.sectionLabel}>AI Assessment:</Text>
          <Text style={styles.reasoningText}>{item.ai_reasoning}</Text>
        </View>

        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.rejectButton, isProcessing && styles.disabledButton]}
            onPress={() => rejectRequest(item.id, item.patient_name)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#dc2626" size="small" />
            ) : (
              <>
                <IconSymbol name="xmark.circle" size={20} color="#dc2626" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, isProcessing && styles.disabledButton]}
            onPress={() => acceptRequest(item.id, item.patient_name)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <IconSymbol
                  name="checkmark.circle.fill"
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.acceptButtonText}>
                  Accept & Add to Queue
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading patient requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patient Requests</Text>
        <View style={styles.requestStats}>
          <Text style={styles.requestCount}>{requests.length} pending</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <IconSymbol name="arrow.clockwise" size={20} color="#16a34a" />
          </TouchableOpacity>
        </View>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="person.badge.plus" size={64} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySubtitle}>
            Patient requests for admission will appear here when they use the
            "Find Care For Me" feature
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom padding for tab bar */}
      <View style={styles.tabBarPadding} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafe",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafe",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
  },
  requestStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  requestCount: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  requestItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 14,
    color: "#64748b",
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: "600",
  },
  requestContent: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0ea5e9",
  },
  reasoningText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  requestActions: {
    flexDirection: "row",
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  rejectButtonText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
  },
  acceptButton: {
    flex: 2,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  tabBarPadding: {
    height: 120,
    backgroundColor: "transparent",
  },
});
