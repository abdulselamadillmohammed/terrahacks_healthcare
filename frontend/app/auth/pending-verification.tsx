// File: app/auth/pending-verification.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { IconSymbol } from "@/components/ui/IconSymbol";

export default function PendingVerificationScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol name="clock.fill" size={80} color="#f59e0b" />
        </View>

        <Text style={styles.title}>Account Under Review</Text>

        <Text style={styles.description}>
          Thank you for registering your hospital with VitaLink! Your account
          submission has been received and is currently under review by our
          administrative team.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <IconSymbol name="1.circle.fill" size={20} color="#2c5aa0" />
              <Text style={styles.infoText}>
                Our team will verify your hospital credentials and information
              </Text>
            </View>
            <View style={styles.infoItem}>
              <IconSymbol name="2.circle.fill" size={20} color="#2c5aa0" />
              <Text style={styles.infoText}>
                You will receive an email notification once approved
              </Text>
            </View>
            <View style={styles.infoItem}>
              <IconSymbol name="3.circle.fill" size={20} color="#2c5aa0" />
              <Text style={styles.infoText}>
                Once verified, you can log in and access hospital features
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Expected Timeline</Text>
          <Text style={styles.timelineText}>
            ⏱️ Verification typically takes 1-3 business days
          </Text>
          <Text style={styles.timelineSubtext}>
            We'll prioritize your application to get you connected to the
            VitaLink emergency network as quickly as possible.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/auth/login")}
        >
          <IconSymbol name="arrow.left.circle.fill" size={20} color="#ffffff" />
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => {
            // You can implement email support or contact functionality here
            console.log("Contact support pressed");
          }}
        >
          <Text style={styles.supportButtonText}>
            Need Help? Contact Support
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafe",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: "#fef3c7",
    borderRadius: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
    textAlign: "center",
  },
  infoList: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  timelineCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: "100%",
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0c4a6e",
    marginBottom: 8,
  },
  timelineText: {
    fontSize: 14,
    color: "#0c4a6e",
    marginBottom: 8,
    fontWeight: "500",
  },
  timelineSubtext: {
    fontSize: 12,
    color: "#0369a1",
    lineHeight: 18,
  },
  backButton: {
    backgroundColor: "#2c5aa0",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    minWidth: 200,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  supportButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  supportButtonText: {
    color: "#2c5aa0",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
