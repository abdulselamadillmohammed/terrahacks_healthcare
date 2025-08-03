// File: app/auth/login.tsx - Updated with Hospital Routing
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import apiClient from "../../api/apiClient";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Get login tokens
      const loginResponse = await apiClient.post("/token/", {
        username: username,
        password: password,
      });

      console.log("Login response:", loginResponse.data);

      // Step 2: Store tokens temporarily to check user profile
      await SecureStore.setItemAsync("accessToken", loginResponse.data.access);
      await SecureStore.setItemAsync(
        "refreshToken",
        loginResponse.data.refresh
      );

      // Step 3: Check user profile to verify account status
      try {
        const profileResponse = await apiClient.get("/user/profile/");
        const userData = profileResponse.data;

        console.log("User data:", userData);

        // Step 4: Check user type and verification status
        if (userData.user_type === "hospital") {
          if (!userData.is_verified) {
            // Remove tokens for unverified hospital accounts
            await SecureStore.deleteItemAsync("accessToken");
            await SecureStore.deleteItemAsync("refreshToken");

            Alert.alert(
              "Account Pending Verification",
              "Your hospital account is still under review by our administrative team. You will receive an email notification once your account is approved.\n\nPlease contact support if you have any questions.",
              [{ text: "OK" }]
            );
            return;
          } else {
            // Verified hospital - redirect to hospital dashboard
            console.log(
              "Verified hospital login - redirecting to hospital tabs"
            );
            router.replace("/(hospital)/queue");
          }
        } else if (userData.user_type === "patient") {
          // Patient login - redirect to patient tabs
          console.log("Patient login successful - redirecting to patient tabs");
          router.replace("/(tabs)");
        }
      } catch (profileError: any) {
        console.error("Profile fetch error:", profileError);

        // Remove tokens if profile fetch fails
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");

        Alert.alert(
          "Login Error",
          "Unable to verify account status. Please try again or contact support."
        );
      }
    } catch (loginError: any) {
      console.error("Login error:", loginError.response?.data);

      let errorMessage = "Invalid username or password. Please try again.";

      // Handle specific error cases
      if (loginError.response?.status === 401) {
        errorMessage = "Invalid username or password.";
      } else if (loginError.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      }

      Alert.alert("Login Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.appName}>VitaLink</Text>
          <Text style={styles.tagline}>Your lifeline in emergencies</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to access your account</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Create Account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>👥 Account Types</Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Patients:</Text> Access emergency
              features and AI health assistant{"\n"}
              <Text style={styles.infoBold}>Hospitals:</Text> Manage patient
              queue and emergency responses
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔐 Verification Status</Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Patients:</Text> Immediate access
              after registration{"\n"}
              <Text style={styles.infoBold}>Hospitals:</Text> Require admin
              verification (1-3 business days)
            </Text>
          </View>
        </View>

        <View style={styles.emergencyNotice}>
          <Text style={styles.emergencyText}>
            🚨 In a real emergency, always call 911 first
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafe",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2c5aa0",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
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
  loginButton: {
    backgroundColor: "#2c5aa0",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupText: {
    fontSize: 14,
    color: "#64748b",
  },
  signupLink: {
    fontSize: 14,
    color: "#2c5aa0",
    fontWeight: "600",
  },
  infoSection: {
    marginTop: 24,
    gap: 12,
  },
  infoCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0c4a6e",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#0369a1",
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: "600",
  },
  emergencyNotice: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  emergencyText: {
    fontSize: 14,
    color: "#991b1b",
    textAlign: "center",
    fontWeight: "500",
  },
});
