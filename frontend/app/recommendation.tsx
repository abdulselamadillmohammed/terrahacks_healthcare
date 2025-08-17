// File: app/recommendation.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useVoiceAssistantContext } from "@/components/VoiceAssistantProvider";

interface HospitalData {
  id: number;
  hospital_name: string;
  address: string;
  phone_number: string;
  latitude: number;
  longitude: number;
  current_wait_time: number;
}

export default function RecommendationScreen() {
  const params = useLocalSearchParams();
  const { speak } = useVoiceAssistantContext();
  const [hospitalData, setHospitalData] = useState<HospitalData | null>(null);
  const [reasoning, setReasoning] = useState<string>("");
  const [requestId, setRequestId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isVoiceTriggered, setIsVoiceTriggered] = useState(false);

  useEffect(() => {
    // Parse the data passed from the care request
    try {
      if (params.hospitalData) {
        const hospital = JSON.parse(params.hospitalData as string);
        setHospitalData(hospital);
      }

      if (params.reasoning) {
        setReasoning(params.reasoning as string);
      }

      if (params.requestId) {
        setRequestId(params.requestId as string);
      }

      // Check if this was triggered by voice assistant
      if (params.source === 'voice_assistant') {
        setIsVoiceTriggered(true);
        // Provide voice feedback for voice-triggered care requests
        speak("I've found a hospital that can help with your symptoms. Here are the details.");
      }
    } catch (error) {
      console.error("Error parsing recommendation data:", error);
      Alert.alert(
        "Data Error",
        "Unable to load recommendation information. Returning to explore.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/explore") }]
      );
    } finally {
      setLoading(false);
    }
  }, [params, speak]); // Added speak to dependencies

  const formatWaitTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  const openDirections = () => {
    if (!hospitalData) return;

    const query = encodeURIComponent(
      `${hospitalData.hospital_name}, ${hospitalData.address}`
    );
    const url = `https://maps.google.com/maps?q=${query}`;

    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to open maps application");
    });
  };

  const callHospital = () => {
    if (!hospitalData?.phone_number) return;

    const phoneNumber = `tel:${hospitalData.phone_number.replace(
      /[^\d]/g,
      ""
    )}`;
    Linking.openURL(phoneNumber);
  };

  const goToExplore = () => {
    router.replace("/(tabs)/explore");
  };

  const goToHome = () => {
    router.replace("/(tabs)");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>
          Processing your recommendation...
        </Text>
      </View>
    );
  }

  if (!hospitalData) {
    return (
      <View style={styles.errorContainer}>
        <IconSymbol
          name="exclamationmark.triangle.fill"
          size={64}
          color="#ef4444"
        />
        <Text style={styles.errorTitle}>Recommendation Error</Text>
        <Text style={styles.errorMessage}>
          Unable to load hospital recommendation
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={goToExplore}>
          <Text style={styles.primaryButtonText}>Back to Explore</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goToExplore}>
          <IconSymbol name="chevron.left" size={24} color="#7c3aed" />
          <Text style={styles.backText}>Explore</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hospital Recommendation</Text>
        <TouchableOpacity style={styles.homeButton} onPress={goToHome}>
          <IconSymbol name="house.fill" size={20} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <View style={styles.successIcon}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={40}
              color="#16a34a"
            />
          </View>
          <View style={styles.successText}>
            <Text style={styles.successTitle}>
              🏥 We found your best match!
            </Text>
            <Text style={styles.successSubtitle}>
              Based on your symptoms and current wait times, here's our AI
              recommendation
            </Text>
          </View>
        </View>

        {/* Hospital Recommendation Card */}
        <View style={styles.hospitalCard}>
          <View style={styles.hospitalHeader}>
            <IconSymbol
              name="building.2.crop.circle.fill"
              size={32}
              color="#7c3aed"
            />
            <View style={styles.hospitalHeaderText}>
              <Text style={styles.hospitalName}>
                {hospitalData.hospital_name}
              </Text>
              <Text style={styles.hospitalSubtitle}>
                Recommended for your care
              </Text>
            </View>
          </View>

          <View style={styles.hospitalDetails}>
            <View style={styles.detailRow}>
              <IconSymbol name="location.fill" size={20} color="#64748b" />
              <Text style={styles.detailText}>{hospitalData.address}</Text>
            </View>

            <View style={styles.detailRow}>
              <IconSymbol name="clock.fill" size={20} color="#64748b" />
              <Text style={styles.detailText}>
                Current wait time:{" "}
                {formatWaitTime(hospitalData.current_wait_time)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <IconSymbol name="phone.fill" size={20} color="#64748b" />
              <Text style={styles.detailText}>{hospitalData.phone_number}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={openDirections}
            >
              <IconSymbol
                name="arrow.triangle.turn.up.right.diamond.fill"
                size={20}
                color="#ffffff"
              />
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.callButton} onPress={callHospital}>
              <IconSymbol name="phone.fill" size={20} color="#7c3aed" />
              <Text style={styles.callButtonText}>Call Hospital</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Reasoning */}
        <View style={styles.reasoningCard}>
          <Text style={styles.reasoningTitle}>Why we chose this hospital:</Text>
          <Text style={styles.reasoningText}>{reasoning}</Text>
        </View>

        {/* Request Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <IconSymbol
              name="clock.badge.checkmark.fill"
              size={24}
              color="#f59e0b"
            />
            <Text style={styles.statusTitle}>Request Status</Text>
          </View>
          <Text style={styles.statusText}>
            Your admission request has been sent to {hospitalData.hospital_name}
            . They will review your case and may contact you directly if they
            can accommodate you.
          </Text>
          <Text style={styles.requestIdText}>Request ID: #{requestId}</Text>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What happens next?</Text>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              The hospital will review your symptoms and current capacity
            </Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              If they can see you, they'll accept your request and add you to
              their queue
            </Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              You'll receive a notification when your request is accepted or if
              you need to try another hospital
            </Text>
          </View>
        </View>

        {/* Important Notice */}
        <View style={styles.importantNotice}>
          <Text style={styles.noticeTitle}>⚠️ Important Notice</Text>
          <Text style={styles.noticeText}>
            This recommendation is for non-emergency care. If your condition
            worsens or becomes urgent, please call 911 or go to the nearest
            emergency room immediately.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={openDirections}
          >
            <IconSymbol
              name="arrow.triangle.turn.up.right.diamond.fill"
              size={20}
              color="#ffffff"
            />
            <Text style={styles.primaryButtonText}>
              Get Directions to Hospital
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={goToExplore}
          >
            <Text style={styles.secondaryButtonText}>
              Find Another Hospital
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafe",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafe",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafe",
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: "#7c3aed",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },
  homeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  successBanner: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
    alignItems: "center",
  },
  successIcon: {
    marginRight: 16,
  },
  successText: {
    flex: 1,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#15803d",
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#16a34a",
    lineHeight: 20,
  },
  hospitalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  hospitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  hospitalHeaderText: {
    marginLeft: 16,
    flex: 1,
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
  },
  hospitalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  hospitalDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#4b5563",
    marginLeft: 12,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  directionsButton: {
    flex: 1,
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  directionsButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  callButton: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#7c3aed",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  callButtonText: {
    color: "#7c3aed",
    fontSize: 14,
    fontWeight: "600",
  },
  reasoningCard: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  reasoningTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 8,
  },
  reasoningText: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
  },
  statusText: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
    marginBottom: 8,
  },
  requestIdText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  nextStepsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0c4a6e",
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
  stepText: {
    fontSize: 14,
    color: "#0369a1",
    lineHeight: 20,
    flex: 1,
  },
  importantNotice: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#991b1b",
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: "#991b1b",
    lineHeight: 20,
  },
  bottomActions: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "500",
  },
  bottomPadding: {
    height: 40,
  },
});
