// File: app/(tabs)/index.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { IconSymbol } from "@/components/ui/IconSymbol";
import apiClient from "../../api/apiClient";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function HomeScreen() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hello! I'm your AI Health Assistant. I can help you understand symptoms and determine if you need medical attention. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  const handleEmergencyCall = () => {
    Alert.alert(
      "🚨 EMERGENCY CONFIRMATION",
      "This will immediately dispatch emergency services to your location and share your medical profile.\n\nPress 'CALL EMERGENCY' only if this is a real medical emergency.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "CALL EMERGENCY",
          onPress: () => {
            setIsLoading(true);
            apiClient
              .post("/emergency-call/")
              .then((res) => {
                Alert.alert(
                  "🚨 EMERGENCY SERVICES CONTACTED",
                  "Your emergency call has been processed. Emergency services have been notified and are on their way.\n\nStay calm and follow any instructions from emergency responders.",
                  [{ text: "OK" }]
                );
                console.log(res.data.message);
              })
              .catch((err) => {
                console.error("Emergency call error:", err);
                Alert.alert(
                  "❌ Emergency Call Failed",
                  "Unable to reach emergency services through the app. Please dial 911 immediately.",
                  [{ text: "OK" }]
                );
              })
              .finally(() => setIsLoading(false));
          },
          style: "destructive",
        },
      ]
    );
  };

  const pickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera roll permissions to upload images!"
        );
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleChatSubmit = async () => {
    if (!prompt.trim()) {
      Alert.alert(
        "Message Required",
        "Please enter a message for the AI assistant."
      );
      return;
    }

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: prompt,
      isUser: true,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("prompt", prompt);

    if (image) {
      const uri = image.uri;
      const uriParts = uri.split(".");
      const fileType = uriParts[uriParts.length - 1];

      formData.append("image", {
        uri,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      } as any);
    }

    try {
      const res = await apiClient.post("/chatbot/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: res.data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble responding right now. If this is urgent, please consider contacting a healthcare provider or emergency services.",
        isUser: false,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setPrompt("");
      setImage(null);
    }
  };

  const renderMessage = (message: ChatMessage) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          message.isUser ? styles.userMessageText : styles.aiMessageText,
        ]}
      >
        {message.text}
      </Text>
      <Text
        style={[
          styles.timestamp,
          message.isUser ? styles.userTimestamp : styles.aiTimestamp,
        ]}
      >
        {message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );

  if (showAIChat) {
    return (
      <View style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowAIChat(false)}
          >
            <IconSymbol name="chevron.left" size={24} color="#2c5aa0" />
          </TouchableOpacity>
          <Text style={styles.chatTitle}>AI Health Assistant</Text>
          <View style={styles.chatStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        <ScrollView
          style={styles.chatContainer}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#7c3aed" />
              <Text style={styles.loadingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputSection}>
          {image && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <IconSymbol
                  name="xmark.circle.fill"
                  size={24}
                  color="#dc2626"
                />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.chatInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Describe your symptoms or ask a health question..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.imageButton}
              onPress={pickImage}
              disabled={isLoading}
            >
              <IconSymbol name="camera.fill" size={20} color="#7c3aed" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!prompt.trim() || isLoading) && styles.disabledSendButton,
              ]}
              onPress={handleChatSubmit}
              disabled={!prompt.trim() || isLoading}
            >
              <IconSymbol
                name="arrow.up.circle.fill"
                size={32}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>
        </View>
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
        <Text style={styles.appTitle}>VitalLink</Text>
        <Text style={styles.headerSubtitle}>Emergency Response System</Text>
      </View>

      <View style={styles.emergencySection}>
        <View style={styles.emergencyCard}>
          <Text style={styles.emergencyTitle}>Medical Emergency</Text>
          <Text style={styles.emergencySubtitle}>
            Press only in a real emergency
          </Text>

          <TouchableOpacity
            style={[styles.emergencyButton, isLoading && styles.disabledButton]}
            onPress={handleEmergencyCall}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <IconSymbol
                  name="exclamationmark.triangle.fill"
                  size={32}
                  color="#ffffff"
                />
                <Text style={styles.emergencyButtonText}>EMERGENCY</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.emergencyNote}>
            Your location and medical profile will be instantly shared with
            emergency services
          </Text>
        </View>
      </View>

      <View style={styles.aiSection}>
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <IconSymbol
              name="heart.text.square.fill"
              size={32}
              color="#7c3aed"
            />
            <View style={styles.aiHeaderText}>
              <Text style={styles.aiTitle}>AI Health Assistant</Text>
              <Text style={styles.aiSubtitle}>
                Get preliminary health guidance
              </Text>
            </View>
          </View>

          <Text style={styles.aiDescription}>
            Describe symptoms, upload images of concerning areas, or ask
            health-related questions. Our AI can help determine if you need
            professional medical attention.
          </Text>

          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => setShowAIChat(true)}
          >
            <Text style={styles.aiButtonText}>Start Health Consultation</Text>
            <IconSymbol name="chevron.right" size={20} color="#7c3aed" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <IconSymbol name="phone.fill" size={24} color="#dc2626" />
            <Text style={styles.quickActionText}>Call 911</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <IconSymbol name="location.fill" size={24} color="#16a34a" />
            <Text style={styles.quickActionText}>Share Location</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <IconSymbol
              name="person.crop.circle.fill"
              size={24}
              color="#2c5aa0"
            />
            <Text style={styles.quickActionText}>My Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <IconSymbol name="heart.fill" size={24} color="#ea580c" />
            <Text style={styles.quickActionText}>Health Tips</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2c5aa0",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
  },
  emergencySection: {
    padding: 24,
  },
  emergencyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#fecaca",
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  emergencySubtitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 24,
    textAlign: "center",
  },
  emergencyButton: {
    backgroundColor: "#dc2626",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    minWidth: 200,
    shadowColor: "#dc2626",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
  },
  emergencyButtonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  emergencyNote: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    fontStyle: "italic",
  },
  aiSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  aiCard: {
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
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  aiHeaderText: {
    marginLeft: 16,
    flex: 1,
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
  },
  aiSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  aiDescription: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 20,
  },
  aiButton: {
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  aiButtonText: {
    color: "#7c3aed",
    fontSize: 16,
    fontWeight: "600",
  },
  quickActionsSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flex: 1,
    minWidth: "45%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginTop: 8,
    textAlign: "center",
  },
  // AI Chat Styles
  chatHeader: {
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
    padding: 8,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },
  chatStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  statusText: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "500",
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  userMessage: {
    alignSelf: "flex-end",
  },
  aiMessage: {
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    padding: 12,
    borderRadius: 16,
  },
  userMessageText: {
    backgroundColor: "#2c5aa0",
    color: "#ffffff",
    borderBottomRightRadius: 4,
  },
  aiMessageText: {
    backgroundColor: "#f1f5f9",
    color: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  userTimestamp: {
    color: "#64748b",
    textAlign: "right",
  },
  aiTimestamp: {
    color: "#64748b",
    textAlign: "left",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginBottom: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#7c3aed",
    fontStyle: "italic",
  },
  inputSection: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 16,
  },
  imagePreview: {
    position: "relative",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1e293b",
    maxHeight: 100,
  },
  imageButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#faf5ff",
  },
  sendButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    padding: 4,
  },
  disabledSendButton: {
    backgroundColor: "#94a3b8",
  },
});
