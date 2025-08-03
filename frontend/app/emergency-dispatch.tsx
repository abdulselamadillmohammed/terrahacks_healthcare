// File: app/emergency-dispatch.tsx
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
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { IconSymbol } from "@/components/ui/IconSymbol";

interface HospitalData {
  id: number;
  hospital_name: string;
  address: string;
  phone_number: string;
  latitude: number;
  longitude: number;
  current_wait_time: number;
}

export default function EmergencyDispatchScreen() {
  const params = useLocalSearchParams();
  const [hospitalData, setHospitalData] = useState<HospitalData | null>(null);
  const [reasoning, setReasoning] = useState<string>("");
  const [ttsScript, setTtsScript] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Parse the data passed from the emergency button
    try {
      if (params.hospitalData) {
        const hospital = JSON.parse(params.hospitalData as string);
        setHospitalData(hospital);
      }

      if (params.reasoning) {
        setReasoning(params.reasoning as string);
      }

      if (params.ttsScript) {
        setTtsScript(params.ttsScript as string);
      }

      if (params.userLatitude && params.userLongitude) {
        setUserLocation({
          latitude: parseFloat(params.userLatitude as string),
          longitude: parseFloat(params.userLongitude as string),
        });
      }
    } catch (error) {
      console.error("Error parsing emergency dispatch data:", error);
      Alert.alert(
        "Data Error",
        "Unable to load emergency dispatch information. Returning to home.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    } finally {
      setLoading(false);
    }
  }, [params]);

  const openDirections = () => {
    if (!hospitalData || !userLocation) return;

    const url = `https://maps.google.com/maps?saddr=${userLocation.latitude},${userLocation.longitude}&daddr=${hospitalData.latitude},${hospitalData.longitude}`;
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

  const call911 = () => {
    Linking.openURL("tel:911");
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Processing emergency dispatch...</Text>
      </View>
    );
  }

  if (!hospitalData || !userLocation) {
    return (
      <View style={styles.errorContainer}>
        <IconSymbol
          name="exclamationmark.triangle.fill"
          size={64}
          color="#dc2626"
        />
        <Text style={styles.errorTitle}>Emergency Dispatch Error</Text>
        <Text style={styles.errorMessage}>
          Unable to load hospital information
        </Text>
        <TouchableOpacity style={styles.emergencyButton} onPress={call911}>
          <Text style={styles.emergencyButtonText}>Call 911 Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)")}
        >
          <IconSymbol name="chevron.left" size={24} color="#dc2626" />
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Dispatch</Text>
        <TouchableOpacity style={styles.call911Button} onPress={call911}>
          <IconSymbol name="phone.fill" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusIcon}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={40}
              color="#16a34a"
            />
          </View>
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>🚨 Help is on the way!</Text>
            <Text style={styles.statusSubtitle}>
              Emergency services have been contacted and your optimal hospital
              has been selected
            </Text>
          </View>
        </View>

        {/* Hospital Information */}
        <View style={styles.hospitalCard}>
          <View style={styles.hospitalHeader}>
            <IconSymbol
              name="building.2.crop.circle.fill"
              size={32}
              color="#dc2626"
            />
            <View style={styles.hospitalHeaderText}>
              <Text style={styles.hospitalName}>
                {hospitalData.hospital_name}
              </Text>
              <Text style={styles.hospitalSubtitle}>
                Recommended Emergency Facility
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
              <IconSymbol name="phone.fill" size={20} color="#2c5aa0" />
              <Text style={styles.callButtonText}>Call Hospital</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Reasoning */}
        <View style={styles.reasoningCard}>
          <Text style={styles.reasoningTitle}>
            Why this hospital was selected:
          </Text>
          <Text style={styles.reasoningText}>{reasoning}</Text>
        </View>

        {/* Route Map */}
        <View style={styles.mapCard}>
          <Text style={styles.mapTitle}>Route to Hospital</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: (userLocation.latitude + hospitalData.latitude) / 2,
                longitude:
                  (userLocation.longitude + hospitalData.longitude) / 2,
                latitudeDelta:
                  Math.abs(userLocation.latitude - hospitalData.latitude) * 2 +
                  0.01,
                longitudeDelta:
                  Math.abs(userLocation.longitude - hospitalData.longitude) *
                    2 +
                  0.01,
              }}
              showsUserLocation={false}
            >
              {/* User Location Marker */}
              <Marker
                coordinate={userLocation}
                title="Your Location"
                description="Emergency location"
                pinColor="#dc2626"
              />

              {/* Hospital Marker */}
              <Marker
                coordinate={{
                  latitude: hospitalData.latitude,
                  longitude: hospitalData.longitude,
                }}
                title={hospitalData.hospital_name}
                description="Recommended hospital"
                pinColor="#16a34a"
              />
            </MapView>
          </View>
        </View>

        {/* 911 Script Information */}
        <View style={styles.scriptCard}>
          <Text style={styles.scriptTitle}>Emergency Services Information</Text>
          <Text style={styles.scriptSubtitle}>
            The following information has been prepared for emergency
            responders:
          </Text>
          <View style={styles.scriptContent}>
            <Text style={styles.scriptText}>{ttsScript}</Text>
          </View>
        </View>

        {/* Emergency Actions */}
        <View style={styles.emergencyActions}>
          <TouchableOpacity
            style={styles.primaryEmergencyButton}
            onPress={call911}
          >
            <IconSymbol name="phone.fill" size={24} color="#ffffff" />
            <Text style={styles.primaryEmergencyButtonText}>Call 911 Now</Text>
          </TouchableOpacity>

          <Text style={styles.emergencyNote}>
            If this is a life-threatening emergency, call 911 immediately
          </Text>
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
  emergencyButton: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  emergencyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
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
    color: "#dc2626",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },
  call911Button: {
    backgroundColor: "#dc2626",
    borderRadius: 20,
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  statusBanner: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
    alignItems: "center",
  },
  statusIcon: {
    marginRight: 16,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#15803d",
    marginBottom: 4,
  },
  statusSubtitle: {
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
    backgroundColor: "#2c5aa0",
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
    borderColor: "#2c5aa0",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  callButtonText: {
    color: "#2c5aa0",
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
  mapCard: {
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
  mapTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    height: 200,
  },
  map: {
    flex: 1,
  },
  scriptCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  scriptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0c4a6e",
    marginBottom: 8,
  },
  scriptSubtitle: {
    fontSize: 14,
    color: "#0369a1",
    marginBottom: 12,
  },
  scriptContent: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
  },
  scriptText: {
    fontSize: 14,
    color: "#1e293b",
    lineHeight: 20,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  emergencyActions: {
    alignItems: "center",
    marginBottom: 24,
  },
  primaryEmergencyButton: {
    backgroundColor: "#dc2626",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    shadowColor: "#dc2626",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryEmergencyButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  emergencyNote: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    fontStyle: "italic",
  },
  bottomPadding: {
    height: 40,
  },
});
