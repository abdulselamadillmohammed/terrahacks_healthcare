// File: app/(tabs)/explore.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";

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
  const callEmergencyNumber = (number: string) => {
    if (number.includes("Text")) return; // Skip text-based services

    const phoneNumber = `tel:${number.replace(/[^\d]/g, "")}`;
    Linking.openURL(phoneNumber);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Health & Safety Resources</Text>
        <Text style={styles.subtitle}>
          Stay informed and prepared for medical emergencies
        </Text>
      </View>

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
});
