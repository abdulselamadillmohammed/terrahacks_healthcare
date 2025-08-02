// File: app/(tabs)/profile.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { IconSymbol } from "@/components/ui/IconSymbol";
import apiClient from "../../api/apiClient";

export default function ProfileScreen() {
  // Separate state for user info and medical profile
  const [userInfo, setUserInfo] = useState({
    username: "",
    email: "",
  });

  const [profile, setProfile] = useState({
    address: "",
    allergies: "",
    pre_existing_conditions: "",
    emergency_notes: "",
    date_of_birth: "",
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // useFocusEffect will refetch the data every time the screen comes into view
  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [])
  );

  const fetchProfileData = () => {
    setLoading(true);
    apiClient
      .get("/profile/")
      .then((response) => {
        console.log("Profile data received:", response.data);

        // Set user info
        setUserInfo({
          username: response.data.username || "",
          email: response.data.email || "",
        });

        // Set medical profile data - handle both nested and flat structures
        const profileData = response.data.profile || {};
        setProfile({
          address: profileData.address || "",
          allergies: profileData.allergies || "",
          pre_existing_conditions: profileData.pre_existing_conditions || "",
          emergency_notes: profileData.emergency_notes || "",
          date_of_birth: profileData.date_of_birth || "",
        });
      })
      .catch((error) => {
        console.error("Failed to fetch profile:", error);
        // If we get 401, it means tokens are invalid, redirect to login
        if (error.response?.status === 401) {
          Alert.alert("Session Expired", "Please log in again.", [
            { text: "OK", onPress: () => router.replace("/auth/login") },
          ]);
        } else {
          Alert.alert("Error", "Could not load your profile data.");
        }
      })
      .finally(() => setLoading(false));
  };

  const handleUpdateProfile = async () => {
    setIsSaving(true);

    try {
      // Update user info (username, email)
      const userUpdatePromise = apiClient.patch("/user/update/", {
        username: userInfo.username,
        email: userInfo.email,
      });

      // Update medical profile
      const profileUpdatePromise = apiClient.put("/profile/", profile);

      // Wait for both updates to complete
      const [userResponse, profileResponse] = await Promise.all([
        userUpdatePromise,
        profileUpdatePromise,
      ]);

      console.log("User update response:", userResponse.data);
      console.log("Profile update response:", profileResponse.data);

      Alert.alert("Success", "Profile updated successfully!");

      // Refresh the data to show updated values
      fetchProfileData();
    } catch (error: any) {
      console.error("Update failed:", error.response?.data);

      let errorMessage = "Profile update failed!";
      if (error.response?.data?.username) {
        errorMessage = "Username is already taken.";
      } else if (error.response?.data?.email) {
        errorMessage = "Email is already in use.";
      }

      Alert.alert("Error", errorMessage);
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
            // Remove tokens from SecureStore
            await SecureStore.deleteItemAsync("accessToken");
            await SecureStore.deleteItemAsync("refreshToken");
            console.log("Tokens removed from SecureStore");
            router.replace("/auth/login");
          } catch (error) {
            console.error("Logout error:", error);
            // Even if there's an error, navigate to login
            router.replace("/auth/login");
          }
        },
      },
    ]);
  };

  const handleUserInfoChange = (
    field: keyof typeof userInfo,
    value: string
  ) => {
    setUserInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileChange = (field: keyof typeof profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2c5aa0" />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
          <Text style={styles.title}>Medical Profile</Text>
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
          This information will be shared with first responders in an emergency
        </Text>
      </View>

      {/* ACCOUNT INFORMATION CARD - NOW WITH EDITABLE INPUTS */}
      <View style={styles.userInfoCard}>
        <Text style={styles.cardTitle}>Account Information</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            value={userInfo.username}
            onChangeText={(value) => handleUserInfoChange("username", value)}
            placeholder="Enter your username"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={userInfo.email}
            onChangeText={(value) => handleUserInfoChange("email", value)}
            placeholder="your.email@example.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* MEDICAL PROFILE CARD */}
      <View style={styles.profileCard}>
        <Text style={styles.cardTitle}>Emergency Medical Information</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date of Birth *</Text>
          <TextInput
            style={styles.input}
            value={profile.date_of_birth}
            onChangeText={(value) =>
              handleProfileChange("date_of_birth", value)
            }
            placeholder="YYYY-MM-DD (e.g., 1990-06-15)"
            placeholderTextColor="#999"
          />
          <Text style={styles.helpText}>
            Helps medical professionals provide age-appropriate care
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Address *</Text>
          <TextInput
            style={styles.textArea}
            value={profile.address}
            onChangeText={(value) => handleProfileChange("address", value)}
            placeholder="123 Main St, Anytown, State, ZIP"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
          <Text style={styles.helpText}>
            Emergency services will be dispatched to this location
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Known Allergies</Text>
          <TextInput
            style={styles.textArea}
            value={profile.allergies}
            onChangeText={(value) => handleProfileChange("allergies", value)}
            placeholder="e.g., Penicillin, Peanuts, Latex"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
          />
          <Text style={styles.helpText}>
            Critical for preventing adverse drug reactions
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Pre-existing Medical Conditions</Text>
          <TextInput
            style={styles.textArea}
            value={profile.pre_existing_conditions}
            onChangeText={(value) =>
              handleProfileChange("pre_existing_conditions", value)
            }
            multiline
            numberOfLines={3}
            placeholder="e.g., Type 2 Diabetes, Hypertension, Asthma"
            placeholderTextColor="#999"
          />
          <Text style={styles.helpText}>
            Helps paramedics understand your medical history
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Critical Emergency Notes</Text>
          <TextInput
            style={styles.textArea}
            value={profile.emergency_notes}
            onChangeText={(value) =>
              handleProfileChange("emergency_notes", value)
            }
            multiline
            numberOfLines={4}
            placeholder="e.g., At high risk of stroke, lives alone, emergency contact: John Doe (555) 123-4567"
            placeholderTextColor="#999"
          />
          <Text style={styles.helpText}>
            Any additional information that could save your life
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, isSaving && styles.disabledButton]}
          onPress={handleUpdateProfile}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>Update Profile</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔒 Your medical information is encrypted and only shared with
          emergency responders when you trigger an emergency call.
        </Text>
      </View>

      {/* CRITICAL: Bottom padding to ensure content is visible above tab bar */}
      <View style={styles.tabBarPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafe",
  },
  scrollContent: {
    flexGrow: 1,
  },
  // CRITICAL: This ensures content is never hidden behind the tab bar
  tabBarPadding: {
    height: 120, // Accounts for tab bar height + safe area + extra margin
    backgroundColor: "transparent",
  },
  centered: {
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
  userInfoCard: {
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
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
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
  // CRITICAL: These input styles make the fields actually editable
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    // Ensure the input is focusable and editable
    minHeight: 50,
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
  updateButton: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
  },
  updateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    margin: 24,
    marginTop: 0,
    padding: 20,
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  footerText: {
    fontSize: 14,
    color: "#0c4a6e",
    textAlign: "center",
    lineHeight: 20,
  },
});
