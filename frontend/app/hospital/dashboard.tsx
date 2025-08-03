// File: app/hospital/dashboard.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { IconSymbol } from "@/components/ui/IconSymbol";

export default function HospitalDashboard() {
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      console.log("Hospital tokens removed from SecureStore");
      router.replace("/auth/login");
    } catch (error) {
      console.error("Hospital logout error:", error);
      router.replace("/auth/login");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Hospital Dashboard</Text>
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
          Welcome to the VitalLink Hospital Portal
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <IconSymbol name="checkmark.circle.fill" size={48} color="#16a34a" />
          <Text style={styles.statusTitle}>Account Verified</Text>
          <Text style={styles.statusText}>
            Your hospital account has been verified and is active in the
            VitalLink emergency network.
          </Text>
        </View>

        <View style={styles.comingSoonCard}>
          <IconSymbol name="hammer.fill" size={48} color="#f59e0b" />
          <Text style={styles.comingSoonTitle}>
            Dashboard Under Development
          </Text>
          <Text style={styles.comingSoonText}>
            The hospital dashboard is currently being developed and will
            include:
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <IconSymbol name="phone.badge.plus" size={20} color="#2c5aa0" />
              <Text style={styles.featureText}>Incoming emergency calls</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="location.circle" size={20} color="#2c5aa0" />
              <Text style={styles.featureText}>Patient location tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="heart.text.square" size={20} color="#2c5aa0" />
              <Text style={styles.featureText}>Medical profile access</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="chart.bar.fill" size={20} color="#2c5aa0" />
              <Text style={styles.featureText}>Response analytics</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol
                name="person.3.sequence.fill"
                size={20}
                color="#2c5aa0"
              />
              <Text style={styles.featureText}>Staff management</Text>
            </View>
          </View>
        </View>

        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Need Assistance?</Text>
          <Text style={styles.supportText}>
            Contact our support team for help with your hospital account or
            VitalLink integration.
          </Text>
          <TouchableOpacity style={styles.supportButton}>
            <IconSymbol name="envelope.fill" size={16} color="#ffffff" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  content: {
    padding: 24,
    gap: 24,
  },
  statusCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  comingSoonCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  comingSoonText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  supportCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
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
});
