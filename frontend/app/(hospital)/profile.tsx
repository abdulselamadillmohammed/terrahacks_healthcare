// File: app/(hospital)/profile.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { IconSymbol } from "@/components/ui/IconSymbol";
import apiClient from "../../api/apiClient";

interface HospitalProfile {
  hospital_name: string;
  address: string;
  phone_number: string;
}

interface UserInfo {
  username: string;
  email: string;
}

export default function HospitalProfileScreen() {
  const [hospitalProfile, setHospitalProfile] = useState<HospitalProfile>({
    hospital_name: "",
    address: "",
    phone_number: "",
  });
  const [userInfo, setUserInfo] = useState<UserInfo>({
    username: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch hospital profile data
  const fetchProfileData = async () => {
    try {
      // Get basic user info
      const userResponse = await apiClient.get("/user/profile/");
      setUserInfo({
        username: userResponse.data.username || "",
        email: userResponse.data.email || "",
      });

      // Get hospital profile data
      const hospitalResponse = await apiClient.get("/hospital/profile/");
      setHospitalProfile(hospitalResponse.data);

      console.log("Hospital profile loaded:", hospitalResponse.data);
    } catch (error) {
      console.error("Failed to fetch hospital profile:", error);
      Alert.alert("Error", "Could not load hospital profile data");
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfileData().finally(() => setLoading(false));
    }, [])
  );

  const handleProfileChange = (field: keyof HospitalProfile, value: string) => {
    setHospitalProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    // Validate required fields
    if (!hospitalProfile.hospital_name.trim()) {
      Alert.alert("Error", "Hospital name is required");
      return;
    }
    if (!hospitalProfile.address.trim()) {
      Alert.alert("Error", "Hospital address is required");
      return;
    }
    if (!hospitalProfile.phone_number.trim()) {
      Alert.alert("Error", "Phone number is required");
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiClient.put(
        "/hospital/profile/",
        hospitalProfile
      );

      console.log("Hospital profile updated:", response.data);
      Alert.alert("Success", "Hospital profile updated successfully");

      // Refresh data to show updated values
      await fetchProfileData();
    } catch (error: any) {
      console.error("Update failed:", error.response?.data);
      Alert.alert("Error", "Failed to update hospital profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync("accessToken");
            await SecureStore.deleteItemAsync("refreshToken");
            console.log("Hospital tokens removed from SecureStore");
            router.replace("/auth/login");
          } catch (error) {
            console.error("Hospital logout error:", error);
            router.replace("/auth/login");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading hospital profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Hospital Profile</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol
              name="rectangle.portrait.and.arrow.right"
              size={20}
              color="#dc2626"
            />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Manage your hospital's public information and settings
        </Text>
      </View>

      {/* Account Information Card */}
      <View style={styles.accountCard}>
        <Text style={styles.cardTitle}>Account Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Username:</Text>
          <Text style={styles.infoValue}>{userInfo.username}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{userInfo.email}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <View style={styles.verifiedBadge}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={16}
              color="#16a34a"
            />
            <Text style={styles.verifiedText}>Verified Hospital</Text>
          </View>
        </View>
      </View>

      {/* Hospital Profile Card */}
      <View style={styles.profileCard}>
        <Text style={styles.cardTitle}>Hospital Information</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Hospital Name *</Text>
          <TextInput
            style={styles.input}
            value={hospitalProfile.hospital_name}
            onChangeText={(value) =>
              handleProfileChange("hospital_name", value)
            }
            placeholder="Enter hospital name"
            placeholderTextColor="#999"
          />
          <Text style={styles.helpText}>
            This name will be displayed to patients and emergency services
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Hospital Address *</Text>
          <TextInput
            style={styles.textArea}
            value={hospitalProfile.address}
            onChangeText={(value) => handleProfileChange("address", value)}
            placeholder="Enter complete hospital address"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
          <Text style={styles.helpText}>
            Include full address for accurate emergency service routing
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={hospitalProfile.phone_number}
            onChangeText={(value) => handleProfileChange("phone_number", value)}
            placeholder="+1 (555) 123-4567"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
          <Text style={styles.helpText}>
            Main hospital contact number for emergency coordination
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveChanges}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol
                name="checkmark.circle.fill"
                size={20}
                color="#ffffff"
              />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Settings Card */}
      <View style={styles.settingsCard}>
        <Text style={styles.cardTitle}>Hospital Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <IconSymbol name="bell.fill" size={24} color="#16a34a" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Emergency Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive alerts for incoming emergency patients
              </Text>
            </View>
          </View>
          <View style={styles.enabledBadge}>
            <Text style={styles.enabledText}>Enabled</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <IconSymbol
              name="chart.line.uptrend.xyaxis"
              size={24}
              color="#16a34a"
            />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Analytics & Reporting</Text>
              <Text style={styles.settingDescription}>
                Track response times and patient outcomes
              </Text>
            </View>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <IconSymbol
              name="person.3.sequence.fill"
              size={24}
              color="#16a34a"
            />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Staff Management</Text>
              <Text style={styles.settingDescription}>
                Manage hospital staff and access permissions
              </Text>
            </View>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
      </View>

      {/* Support Card */}
      <View style={styles.supportCard}>
        <Text style={styles.supportTitle}>Need Help?</Text>
        <Text style={styles.supportText}>
          Contact our support team for assistance with your hospital dashboard
          or VitaLink integration.
        </Text>
        <TouchableOpacity style={styles.supportButton}>
          <IconSymbol name="envelope.fill" size={16} color="#ffffff" />
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom padding for tab bar */}
      <View style={styles.tabBarPadding} />
    </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 22,
  },
  accountCard: {
    backgroundColor: "#ffffff",
    margin: 24,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    margin: 24,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  settingsCard: {
    backgroundColor: "#ffffff",
    margin: 24,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  supportCard: {
    backgroundColor: "#f0f9ff",
    margin: 24,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748b",
  },
  infoValue: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "500",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    textAlignVertical: "top",
    minHeight: 80,
  },
  helpText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    fontStyle: "italic",
  },
  saveButton: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 18,
  },
  enabledBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
  },
  enabledText: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
  },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#fef3c7",
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0c4a6e",
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: "#0369a1",
    lineHeight: 20,
    marginBottom: 16,
  },
  supportButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  supportButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  tabBarPadding: {
    height: 120,
    backgroundColor: "transparent",
  },
});
