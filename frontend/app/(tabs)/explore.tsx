// File: app/(tabs)/explore.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Keyboard, // ADD THIS
  TouchableWithoutFeedback, // ADD THIS
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { router } from "expo-router";
import apiClient from "../../api/apiClient";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useVoiceAssistantContext } from "@/components/VoiceAssistantProvider";

interface Hospital {
  id: number;
  hospital_name: string;
  address: string;
  phone_number: string;
  latitude: number;
  longitude: number;
  current_wait_time: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface HospitalWithScore extends Hospital {
  score: number;
  travel_time: number;
}

const healthTips = [
  {
    title: "Recognize Heart Attack Symptoms",
    description:
      "Chest pain, shortness of breath, nausea, and pain in arms, back, neck, or jaw.",
    icon: "heart.fill",
    color: "#dc2626",
  },
  {
    title: "Stroke Warning Signs",
    description:
      "F.A.S.T. - Face drooping, Arms weak, Speech difficult, Time to call 911.",
    icon: "brain.head.profile",
    color: "#7c3aed",
  },
  {
    title: "Severe Allergic Reactions",
    description:
      "Difficulty breathing, swelling, rapid pulse. Use EpiPen if available.",
    icon: "exclamationmark.triangle.fill",
    color: "#ea580c",
  },
  {
    title: "Choking Response",
    description:
      "Heimlich maneuver: thrust upward into diaphragm until object dislodges.",
    icon: "lungs.fill",
    color: "#0891b2",
  },
];

const emergencyContacts = [
  {
    title: "Emergency Services",
    number: "911",
    description: "Police, Fire, Medical Emergency",
    color: "#dc2626",
  },
  {
    title: "Poison Control",
    number: "1-800-222-1222",
    description: "24/7 Poison Help Hotline",
    color: "#16a34a",
  },
  {
    title: "Crisis Text Line",
    number: "Text HOME to 741741",
    description: "Free 24/7 crisis support",
    color: "#2563eb",
  },
];

export default function ExploreScreen() {
  const { speak, showVoiceAssistant } = useVoiceAssistantContext();
  const [activeTab, setActiveTab] = useState<"map" | "resources" | "voice">("map");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [recommendedHospital, setRecommendedHospital] =
    useState<HospitalWithScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Find Care For Me modal state
  const [showCareModal, setShowCareModal] = useState(false);
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Haversine distance calculation (in kilometers)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate travel time based on distance (assuming 40 km/h average speed)
  const calculateTravelTime = (distanceKm: number): number => {
    const averageSpeedKmh = 40;
    return Math.round((distanceKm / averageSpeedKmh) * 60); // Convert to minutes
  };

  // Find the best hospital based on travel time + wait time
  const findRecommendedHospital = (
    hospitalList: Hospital[],
    userLoc: UserLocation
  ): HospitalWithScore | null => {
    console.log("🎯 Finding recommended hospital...");
    console.log("🎯 User location for calculation:", userLoc);
    console.log("🎯 Number of hospitals to evaluate:", hospitalList.length);

    if (!userLoc || hospitalList.length === 0) {
      console.log(
        "❌ Cannot find recommended hospital: missing user location or hospitals"
      );
      return null;
    }

    const hospitalsWithScores: HospitalWithScore[] = hospitalList.map(
      (hospital) => {
        const distance = calculateDistance(
          userLoc.latitude,
          userLoc.longitude,
          hospital.latitude,
          hospital.longitude
        );
        const travel_time = calculateTravelTime(distance);
        const score = travel_time + hospital.current_wait_time;

        console.log(`🏥 ${hospital.hospital_name}:`);
        console.log(`   📏 Distance: ${distance.toFixed(2)} km`);
        console.log(`   🚗 Travel time: ${travel_time} minutes`);
        console.log(`   ⏰ Wait time: ${hospital.current_wait_time} minutes`);
        console.log(`   🎯 Total score: ${score} minutes`);

        return {
          ...hospital,
          score,
          travel_time,
        };
      }
    );
    // Render Find Care Modal

    // Sort by score (lowest is best)
    hospitalsWithScores.sort((a, b) => a.score - b.score);
    console.log(
      "🏆 Recommended hospital:",
      hospitalsWithScores[0]?.hospital_name
    );
    console.log("🏆 Best score:", hospitalsWithScores[0]?.score, "minutes");

    return hospitalsWithScores[0];
  };

  // Voice Assistant Content
  const renderVoiceAssistantContent = () => (
    <ScrollView style={styles.voiceAssistantContainer}>
      <View style={styles.voiceAssistantHeader}>
        <IconSymbol name="mic.fill" size={48} color="#007AFF" />
        <Text style={styles.voiceAssistantTitle}>Voice Assistant</Text>
        <Text style={styles.voiceAssistantSubtitle}>
          Get help hands-free when you can't use your phone
        </Text>
      </View>

      <View style={styles.voiceAssistantFeatures}>
        <View style={styles.featureCard}>
          <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#FF3B30" />
          <Text style={styles.featureTitle}>Emergency Voice Commands</Text>
          <Text style={styles.featureDescription}>
            Say "emergency" or describe your symptoms to get immediate help
          </Text>
        </View>

        <View style={styles.featureCard}>
          <IconSymbol name="heart.fill" size={32} color="#34C759" />
          <Text style={styles.featureTitle}>Care Request Voice Commands</Text>
          <Text style={styles.featureDescription}>
            Describe your symptoms to find the right hospital for your needs
          </Text>
        </View>

        <View style={styles.featureCard}>
          <IconSymbol name="car.fill" size={32} color="#FF9500" />
          <Text style={styles.featureTitle}>Perfect for Driving</Text>
          <Text style={styles.featureDescription}>
            Keep your hands on the wheel while getting medical assistance
          </Text>
        </View>

        <View style={styles.featureCard}>
          <IconSymbol name="hand.raised.fill" size={32} color="#AF52DE" />
          <Text style={styles.featureTitle}>Injury-Friendly</Text>
          <Text style={styles.featureDescription}>
            Get help even when you can't use your hands due to injury
          </Text>
        </View>
      </View>

      <View style={styles.voiceAssistantActions}>
        <TouchableOpacity
          style={styles.voiceAssistantButton}
          onPress={showVoiceAssistant}
        >
          <IconSymbol name="mic.fill" size={24} color="#fff" />
          <Text style={styles.voiceAssistantButtonText}>Try Voice Assistant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => speak("Voice assistant demo activated. You can test voice commands without actual voice input.")}
        >
          <Text style={styles.demoButtonText}>Demo Mode</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.voiceAssistantExamples}>
        <Text style={styles.examplesTitle}>Example Voice Commands:</Text>
        
        <View style={styles.exampleSection}>
          <Text style={styles.exampleSectionTitle}>🚨 Emergency:</Text>
          <Text style={styles.exampleText}>• "I'm having chest pain"</Text>
          <Text style={styles.exampleText}>• "Help, I can't breathe"</Text>
          <Text style={styles.exampleText}>• "Emergency, I need an ambulance"</Text>
        </View>

        <View style={styles.exampleSection}>
          <Text style={styles.exampleSectionTitle}>🏥 Care Request:</Text>
          <Text style={styles.exampleText}>• "I have a fever and headache"</Text>
          <Text style={styles.exampleText}>• "My hand is cut and bleeding"</Text>
          <Text style={styles.exampleText}>• "I feel dizzy and nauseous"</Text>
        </View>
      </View>
    </ScrollView>
  );

  // Then replace your renderFindCareModal function with this improved version:
  const renderFindCareModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showCareModal}
      onRequestClose={() => setShowCareModal(false)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.careModalContent}>
              <View style={styles.careModalHeader}>
                <Text style={styles.careModalTitle}>
                  Describe Your Symptoms
                </Text>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowCareModal(false);
                  }}
                >
                  <IconSymbol name="xmark" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.careModalSubtitle}>
                Tell us what's bothering you, and our AI will recommend the best
                hospital based on your condition and current wait times.
              </Text>

              <TextInput
                style={styles.symptomsInput}
                value={reasonForVisit}
                onChangeText={setReasonForVisit}
                placeholder="e.g., I have a deep cut on my hand, I've had a persistent fever for 3 days, chest pain and shortness of breath..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                maxLength={1000}
                textAlignVertical="top"
                blurOnSubmit={true}
                returnKeyType="done"
              />

              <Text style={styles.characterCount}>
                {reasonForVisit.length}/1000 characters
              </Text>

              <View style={styles.careModalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowCareModal(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.findHospitalButton,
                    (!reasonForVisit.trim() || submittingRequest) &&
                      styles.findHospitalButtonDisabled,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleFindCareRequest();
                  }}
                  disabled={!reasonForVisit.trim() || submittingRequest}
                >
                  {submittingRequest ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <IconSymbol
                        name="magnifyingglass"
                        size={20}
                        color="#ffffff"
                      />
                      <Text style={styles.findHospitalButtonText}>
                        Find Best Hospital
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.careModalDisclaimer}>
                This is for non-emergency situations. If you're experiencing a
                medical emergency, call 911 immediately.
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Request location permission and get user location
  const getUserLocation = async () => {
    try {
      console.log("🔍 Requesting location permission...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("📍 Location permission status:", status);

      if (status !== "granted") {
        console.log("❌ Location permission denied");
        setLocationPermission(false);
        setError(
          "Location permission denied. Please enable location access to find nearby hospitals."
        );
        return;
      }

      setLocationPermission(true);
      console.log(
        "✅ Location permission granted, getting current position..."
      );

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log("📱 Raw location data:", location);

      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log("🎯 User location processed:", userLoc);
      console.log("🎯 User latitude:", userLoc.latitude);
      console.log("🎯 User longitude:", userLoc.longitude);

      setUserLocation(userLoc);
      return userLoc;
    } catch (error) {
      console.error("❌ Error getting location:", error);
      setError(
        "Unable to get your location. Please check your device settings."
      );
    }
  };

  // Fetch hospitals from API
  const fetchHospitals = async () => {
    try {
      console.log("🏥 Fetching hospitals from API...");
      const response = await apiClient.get("/hospitals/");
      console.log("🏥 API Response status:", response.status);
      console.log("🏥 Raw hospital data:", response.data);
      console.log("🏥 Number of hospitals received:", response.data.length);

      // Log each hospital's coordinates
      response.data.forEach((hospital: Hospital, index: number) => {
        console.log(`🏥 Hospital ${index + 1}: ${hospital.hospital_name}`);
        console.log(`   📍 Latitude: ${hospital.latitude}`);
        console.log(`   📍 Longitude: ${hospital.longitude}`);
        console.log(`   ⏰ Wait time: ${hospital.current_wait_time} minutes`);
        console.log(`   📮 Address: ${hospital.address}`);

        // Check for invalid coordinates
        if (!hospital.latitude || !hospital.longitude) {
          console.warn(
            `⚠️  Hospital ${hospital.hospital_name} has missing coordinates!`
          );
        }
        if (isNaN(hospital.latitude) || isNaN(hospital.longitude)) {
          console.warn(
            `⚠️  Hospital ${hospital.hospital_name} has invalid coordinates!`
          );
        }
      });

      setHospitals(response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ Error fetching hospitals:", error);
      if (error.response) {
        console.error("❌ API Error status:", error.response.status);
        console.error("❌ API Error data:", error.response.data);
      }
      setError("Unable to load hospital information. Please try again.");
      return [];
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      console.log("🚀 Initializing map data...");
      setLoading(true);
      setError(null);

      try {
        console.log("📡 Starting parallel data fetch...");
        // Get user location and hospital data simultaneously
        const [userLoc, hospitalData] = await Promise.all([
          getUserLocation(),
          fetchHospitals(),
        ]);

        console.log("📊 Data fetch results:");
        console.log("   User location:", userLoc);
        console.log("   Hospital count:", hospitalData?.length || 0);

        if (userLoc && hospitalData.length > 0) {
          console.log(
            "✅ Both location and hospital data available, finding recommendation..."
          );
          const recommended = findRecommendedHospital(hospitalData, userLoc);
          setRecommendedHospital(recommended);
          console.log(
            "🎯 Recommendation set:",
            recommended?.hospital_name || "None"
          );
        } else {
          console.log("❌ Missing data for recommendation:");
          console.log("   User location available:", !!userLoc);
          console.log("   Hospitals available:", hospitalData.length > 0);
        }
      } catch (error) {
        console.error("❌ Initialization error:", error);
        setError("Unable to load map data. Please try again.");
      } finally {
        console.log("✅ Initialization complete");
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Open device settings for location permissions
  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  // Retry loading data
  const retryLoading = () => {
    setError(null);
    getUserLocation();
    fetchHospitals();
  };

  // Format wait time for display
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

  // Call emergency number
  const callEmergencyNumber = (number: string) => {
    if (number.includes("Text")) return; // Skip text-based services
    const phoneNumber = `tel:${number.replace(/[^\d]/g, "")}`;
    Linking.openURL(phoneNumber);
  };

  // Handle "Find Care For Me" request
  const handleFindCareRequest = async () => {
    if (!reasonForVisit.trim()) {
      Alert.alert(
        "Description Required",
        "Please describe your symptoms or reason for visit."
      );
      return;
    }

    if (!userLocation) {
      Alert.alert(
        "Location Required",
        "Please enable location services to find the best hospital for you."
      );
      return;
    }

    setSubmittingRequest(true);

    try {
      const response = await apiClient.post("/request-admission/", {
        reason_for_visit: reasonForVisit.trim(),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });

      console.log("Care request submitted:", response.data);

      // Close modal and reset form
      setShowCareModal(false);
      setReasonForVisit("");

      // Navigate to recommendation screen
      router.push({
        pathname: "/recommendation",
        params: {
          hospitalData: JSON.stringify(response.data.recommended_hospital),
          reasoning: response.data.reasoning,
          requestId: response.data.request_id.toString(),
        },
      });
    } catch (error: any) {
      console.error("Care request error:", error);
      console.error("Care request error:", error);
      console.error("Error response data:", error.response?.data); // Add this line
      console.error("Error status:", error.response?.status); // Add this line

      let errorMessage = "Unable to process your request. Please try again.";

      if (error.response?.status === 429) {
        errorMessage =
          "You can only make one hospital request per day. Please check your existing request or try again tomorrow.";
      } else if (error.response?.status === 503) {
        errorMessage =
          "No hospitals are currently available. Please try again later or call 911 if this is an emergency.";
      }

      Alert.alert("Request Failed", errorMessage);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Render tab selector
  const renderTabSelector = () => (
    <View style={styles.tabSelector}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === "map" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab("map")}
      >
        <IconSymbol
          name="map.fill"
          size={20}
          color={activeTab === "map" ? "#ffffff" : "#64748b"}
        />
        <Text
          style={[
            styles.tabButtonText,
            activeTab === "map" && styles.tabButtonTextActive,
          ]}
        >
          Find Hospitals
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === "resources" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab("resources")}
      >
        <IconSymbol
          name="heart.text.square.fill"
          size={20}
          color={activeTab === "resources" ? "#ffffff" : "#64748b"}
        />
        <Text
          style={[
            styles.tabButtonText,
            activeTab === "resources" && styles.tabButtonTextActive,
          ]}
        >
          Health Tips
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === "voice" && styles.tabButtonActive,
        ]}
        onPress={() => setActiveTab("voice")}
      >
        <IconSymbol
          name="mic.fill"
          size={20}
          color={activeTab === "voice" ? "#ffffff" : "#64748b"}
        />
        <Text
          style={[
            styles.tabButtonText,
            activeTab === "voice" && styles.tabButtonTextActive,
          ]}
        >
          Voice Assistant
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Replace your renderMapContent function with this corrected version:

  const renderMapContent = () => {
    // Loading screen
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2c5aa0" />
          <Text style={styles.loadingText}>Finding nearby hospitals...</Text>
          <Text style={styles.loadingSubtext}>
            Getting your location and loading hospital data
          </Text>
        </View>
      );
    }

    // Error screen
    if (error) {
      return (
        <View style={styles.centerContainer}>
          <IconSymbol
            name="exclamationmark.triangle.fill"
            size={64}
            color="#ef4444"
          />
          <Text style={styles.errorTitle}>Unable to Load Map</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <View style={styles.errorActions}>
            {!locationPermission && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={openSettings}
              >
                <IconSymbol name="gear" size={20} color="#ffffff" />
                <Text style={styles.settingsButtonText}>Open Settings</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
              <IconSymbol name="arrow.clockwise" size={20} color="#ffffff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // No user location available
    if (!userLocation) {
      return (
        <View style={styles.centerContainer}>
          <IconSymbol name="location.slash" size={64} color="#94a3b8" />
          <Text style={styles.errorTitle}>Location Required</Text>
          <Text style={styles.errorMessage}>
            We need your location to show nearby hospitals and provide
            recommendations.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        {/* Recommendation Banner */}
        {recommendedHospital && (
          <View style={styles.recommendationBanner}>
            <View style={styles.recommendationContent}>
              <IconSymbol name="star.fill" size={20} color="#f59e0b" />
              <View style={styles.recommendationText}>
                <Text style={styles.recommendationTitle}>
                  Recommended Hospital
                </Text>
                <Text style={styles.recommendationSubtitle}>
                  {recommendedHospital.hospital_name} •{" "}
                  {recommendedHospital.score} min total
                </Text>
              </View>
            </View>
            <Text style={styles.recommendationScore}>
              {formatWaitTime(recommendedHospital.travel_time)} travel +{" "}
              {formatWaitTime(recommendedHospital.current_wait_time)} wait
            </Text>
          </View>
        )}

        {/* Map View */}
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsTraffic={false}
          onMapReady={() => {
            console.log("🗺️  Map is ready");
            console.log("🗺️  Map center:", {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            });
          }}
        >
          {/* User Location Marker */}
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="You are here"
            pinColor="#2c5aa0"
            onPress={() => console.log("📍 User location marker pressed")}
          />

          {/* Hospital Markers */}
          {hospitals.map((hospital) => {
            const isRecommended = recommendedHospital?.id === hospital.id;

            console.log(`🏥 Rendering marker for ${hospital.hospital_name}:`, {
              latitude: hospital.latitude,
              longitude: hospital.longitude,
              isRecommended,
            });

            return (
              <Marker
                key={hospital.id}
                coordinate={{
                  latitude: hospital.latitude,
                  longitude: hospital.longitude,
                }}
                title={hospital.hospital_name}
                description={`Est. Wait Time: ${formatWaitTime(
                  hospital.current_wait_time
                )}`}
                pinColor={isRecommended ? "#16a34a" : "#ef4444"}
                onPress={() => {
                  console.log(
                    `🏥 Hospital marker pressed: ${hospital.hospital_name}`
                  );
                }}
              >
                <Callout style={styles.callout}>
                  <View style={styles.calloutContainer}>
                    <View style={styles.calloutHeader}>
                      <Text style={styles.calloutTitle}>
                        {hospital.hospital_name}
                      </Text>
                      {isRecommended && (
                        <View style={styles.recommendedBadge}>
                          <IconSymbol
                            name="star.fill"
                            size={12}
                            color="#f59e0b"
                          />
                          <Text style={styles.recommendedBadgeText}>Best</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.calloutAddress}>
                      {hospital.address}
                    </Text>

                    <View style={styles.calloutStats}>
                      <View style={styles.calloutStat}>
                        <IconSymbol
                          name="clock.fill"
                          size={16}
                          color="#64748b"
                        />
                        <Text style={styles.calloutStatText}>
                          Wait: {formatWaitTime(hospital.current_wait_time)}
                        </Text>
                      </View>

                      {isRecommended && recommendedHospital && (
                        <View style={styles.calloutStat}>
                          <IconSymbol
                            name="location.fill"
                            size={16}
                            color="#64748b"
                          />
                          <Text style={styles.calloutStatText}>
                            Travel:{" "}
                            {formatWaitTime(recommendedHospital.travel_time)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity style={styles.directionsButton}>
                      <IconSymbol
                        name="arrow.triangle.turn.up.right.diamond.fill"
                        size={16}
                        color="#ffffff"
                      />
                      <Text style={styles.directionsButtonText}>
                        Get Directions
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        {/* Emergency Notice */}
        <View style={styles.emergencyNotice}>
          <View style={styles.emergencyContent}>
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={20}
              color="#ef4444"
            />
            <Text style={styles.emergencyText}>
              In a real emergency, always call 911 first
            </Text>
          </View>
        </View>

        {/* Find Care For Me Button - ADD THIS HERE */}
        <TouchableOpacity
          style={styles.findCareButton}
          onPress={() => setShowCareModal(true)}
          activeOpacity={0.8}
        >
          <IconSymbol name="magnifyingglass" size={20} color="#ffffff" />
          <Text style={styles.findCareButtonText}>Find Care For Me</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render resources tab content
  const renderResourcesContent = () => (
    <ScrollView
      style={styles.resourcesContainer}
      contentContainerStyle={styles.resourcesScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Recognition</Text>
        <Text style={styles.sectionDescription}>
          Learn to identify critical medical emergencies
        </Text>

        {healthTips.map((tip, index) => (
          <View key={index} style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${tip.color}20` },
                ]}
              >
                <IconSymbol
                  name={tip.icon as any}
                  size={24}
                  color={tip.color}
                />
              </View>
              <Text style={styles.tipTitle}>{tip.title}</Text>
            </View>
            <Text style={styles.tipDescription}>{tip.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <Text style={styles.sectionDescription}>
          Quick access to essential emergency numbers
        </Text>

        {emergencyContacts.map((contact, index) => (
          <TouchableOpacity
            key={index}
            style={styles.contactCard}
            onPress={() => callEmergencyNumber(contact.number)}
          >
            <View style={styles.contactHeader}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${contact.color}20` },
                ]}
              >
                <IconSymbol name="phone.fill" size={20} color={contact.color} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{contact.title}</Text>
                <Text style={styles.contactNumber}>{contact.number}</Text>
              </View>
            </View>
            <Text style={styles.contactDescription}>{contact.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerTitle}>⚠️ Important Disclaimer</Text>
        <Text style={styles.disclaimerText}>
          This app provides general information and should not replace
          professional medical advice. In a true emergency, always call 911
          immediately.
        </Text>
      </View>

      {/* Bottom padding for tab bar */}
      <View style={styles.tabBarPadding} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {activeTab === "map" ? "Find Hospitals" : "Health & Safety"}
        </Text>
        <Text style={styles.subtitle}>
          {activeTab === "map"
            ? "Locate nearby hospitals with real-time wait times"
            : "Stay informed and prepared for medical emergencies"}
        </Text>
      </View>

      {renderTabSelector()}

      {activeTab === "map" 
        ? renderMapContent() 
        : activeTab === "resources" 
        ? renderResourcesContent() 
        : renderVoiceAssistantContent()
      }

      {/* Render Find Care Modal */}
      {renderFindCareModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafe",
  },
  header: {
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 22,
  },
  tabSelector: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    marginHorizontal: 4,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: "#2c5aa0",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafe",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },
  errorActions: {
    marginTop: 24,
    gap: 12,
    width: "100%",
  },
  settingsButton: {
    backgroundColor: "#6b7280",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  settingsButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#2c5aa0",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  mapContainer: {
    flex: 1,
  },
  recommendationBanner: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    zIndex: 1,
  },
  recommendationContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  recommendationText: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  recommendationSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  recommendationScore: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "500",
    textAlign: "right",
  },
  map: {
    flex: 1,
  },
  callout: {
    width: 280,
  },
  calloutContainer: {
    padding: 12,
    minWidth: 280,
  },
  calloutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#92400e",
  },
  calloutAddress: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
    lineHeight: 20,
  },
  calloutStats: {
    gap: 8,
    marginBottom: 12,
  },
  calloutStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  calloutStatText: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
  },
  directionsButton: {
    backgroundColor: "#2c5aa0",
    borderRadius: 8,
    padding: 12,
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
  emergencyNotice: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    zIndex: 1,
  },
  emergencyContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emergencyText: {
    flex: 1,
    fontSize: 14,
    color: "#991b1b",
    fontWeight: "500",
  },
  findCareButton: {
    position: "absolute",
    bottom: 80,
    right: 16,
    backgroundColor: "#7c3aed",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#7c3aed",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 2,
  },
  findCareButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  careModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  careModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  careModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  closeModalButton: {
    padding: 8,
  },
  careModalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 20,
  },
  symptomsInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    minHeight: 120,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "right",
    marginBottom: 20,
  },
  careModalActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  findHospitalButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#7c3aed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  findHospitalButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  findHospitalButtonText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
  },
  careModalDisclaimer: {
    fontSize: 12,
    color: "#ef4444",
    textAlign: "center",
    fontStyle: "italic",
  },
  resourcesContainer: {
    flex: 1,
  },
  resourcesScrollContent: {
    flexGrow: 1,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
  },
  tipCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  tipDescription: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  contactNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2c5aa0",
    marginTop: 2,
  },
  contactDescription: {
    fontSize: 14,
    color: "#64748b",
  },
  disclaimer: {
    margin: 24,
    padding: 20,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
  },
  tabBarPadding: {
    height: 120,
    backgroundColor: "transparent",
  },
  // Voice Assistant Styles
  voiceAssistantContainer: {
    flex: 1,
    backgroundColor: "#f8fafe",
  },
  voiceAssistantHeader: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#ffffff",
  },
  voiceAssistantTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  voiceAssistantSubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
  voiceAssistantFeatures: {
    padding: 24,
  },
  featureCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 12,
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  voiceAssistantActions: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  voiceAssistantButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  voiceAssistantButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  demoButton: {
    backgroundColor: "#E5E5EA",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  demoButtonText: {
    color: "#666666",
    fontSize: 16,
    fontWeight: "500",
  },
  voiceAssistantExamples: {
    padding: 24,
    backgroundColor: "#ffffff",
    margin: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examplesTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  exampleSection: {
    marginBottom: 16,
  },
  exampleSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
    paddingLeft: 8,
  },
});
