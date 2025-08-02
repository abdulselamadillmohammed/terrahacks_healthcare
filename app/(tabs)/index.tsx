// File: app/(tabs)/index.tsx - SMOOTH KEYBOARD HANDLING
import React, { useState, useEffect, useRef } from "react";
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
  DeviceEventEmitter,
  Keyboard,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { router, useFocusEffect } from "expo-router";
import apiClient from "../../api/apiClient";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  image?: string;
}

export default function HomeScreen() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hello! I'm your AI Health Assistant. I can help you understand symptoms and determine if you need medical attention. I have access to your medical profile to provide personalized guidance. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // Animated value for smooth keyboard transitions
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch user profile when component mounts or focuses
  useFocusEffect(
    React.useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  // Handle tab bar visibility when entering/exiting chat mode
  useEffect(() => {
    if (showAIChat) {
      DeviceEventEmitter.emit("hideTabBar");
    } else {
      DeviceEventEmitter.emit("showTabBar");
    }
  }, [showAIChat]);

  // Handle keyboard events with smooth animations
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        Animated.timing(keyboardHeight, {
          duration: Platform.OS === "ios" ? e.duration || 250 : 250,
          toValue: e.endCoordinates.height,
          useNativeDriver: false,
        }).start();

        // Auto-scroll to bottom when keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      (e) => {
        Animated.timing(keyboardHeight, {
          duration: Platform.OS === "ios" ? e.duration || 250 : 250,
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get("/profile/");
      setUserProfile(response.data);
      console.log("User profile loaded for AI context:", response.data);
    } catch (error) {
      console.error("Failed to fetch user profile for AI:", error);
    }
  };

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
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const buildSystemPrompt = () => {
    if (!userProfile) return "You are a helpful medical AI assistant.";

    const profile = userProfile.profile || {};

    return `You are VitalLink's AI Health Assistant. You have access to the user's medical profile to provide personalized health guidance.

USER MEDICAL PROFILE:
- Name: ${userProfile.username}
- Date of Birth: ${profile.date_of_birth || "Not provided"}
- Address: ${profile.address || "Not provided"}
- Known Allergies: ${profile.allergies || "None listed"}
- Pre-existing Conditions: ${profile.pre_existing_conditions || "None listed"}
- Emergency Notes: ${profile.emergency_notes || "None listed"}

INSTRUCTIONS:
1. Use this medical profile to provide personalized health advice
2. Consider their allergies when suggesting medications or treatments
3. Take their pre-existing conditions into account
4. If they describe symptoms that could be related to their conditions, mention this
5. Always recommend seeking immediate medical attention for serious symptoms
6. Be supportive and informative, but never replace professional medical care
7. If they upload an image, analyze it in context of their medical history
8. Keep responses concise but thorough (2-3 paragraphs max)
9. Use a caring, professional tone

Remember: You are NOT a replacement for professional medical care. Always encourage users to seek appropriate medical attention when needed.`;
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
      image: image?.uri,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Auto-scroll to bottom after adding message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("system_prompt", buildSystemPrompt());

      if (image && image.base64) {
        formData.append("image_base64", image.base64);
        formData.append(
          "image_mime_type",
          `image/${image.uri.split(".").pop()}`
        );
      }

      const res = await apiClient.post("/chatbot/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: res.data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, aiMessage]);

      // Auto-scroll to bottom after AI response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
      {message.image && (
        <Image source={{ uri: message.image }} style={styles.messageImage} />
      )}
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
      <View style={styles.chatFullScreen}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowAIChat(false)}
          >
            <IconSymbol name="chevron.left" size={24} color="#2c5aa0" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.chatTitle}>AI Health Assistant</Text>
          <View style={styles.chatStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {chatMessages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#7c3aed" />
              <Text style={styles.loadingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>

        <Animated.View
          style={[
            styles.inputSection,
            {
              marginBottom: keyboardHeight,
            },
          ]}
        >
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
              blurOnSubmit={false}
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
        </Animated.View>
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
                Get personalized health guidance
              </Text>
            </View>
          </View>

          <Text style={styles.aiDescription}>
            Our AI knows your medical history and can provide personalized
            advice. Describe symptoms, upload images, or ask health questions
            for guidance tailored to your profile.
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
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => Alert.alert("Feature", "Calling 911...")}
          >
            <IconSymbol name="phone.fill" size={24} color="#dc2626" />
            <Text style={styles.quickActionText}>Call 911</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => Alert.alert("Feature", "Sharing location...")}
          >
            <IconSymbol name="location.fill" size={24} color="#16a34a" />
            <Text style={styles.quickActionText}>Share Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <IconSymbol
              name="person.crop.circle.fill"
              size={24}
              color="#2c5aa0"
            />
            <Text style={styles.quickActionText}>My Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push("/(tabs)/explore")}
          >
            <IconSymbol name="heart.fill" size={24} color="#ea580c" />
            <Text style={styles.quickActionText}>Health Tips</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  tabBarPadding: {
    height: 120,
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

  // SMOOTH CHAT STYLES
  chatFullScreen: {
    flex: 1,
    backgroundColor: "#f8fafe",
  },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: "#2c5aa0",
    fontWeight: "500",
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
  chatScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
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
    minHeight: 40,
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
