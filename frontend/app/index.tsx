// File: app/index.tsx
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

export default function IndexScreen() {
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");

      console.log("Checking auth status - token found:", !!token);

      if (token) {
        // User is logged in, navigate to main app
        router.replace("/(tabs)");
      } else {
        // User is not logged in, navigate to login
        router.replace("/auth/login");
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      // Default to login screen on error
      router.replace("/auth/login");
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2c5aa0" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafe",
  },
});
