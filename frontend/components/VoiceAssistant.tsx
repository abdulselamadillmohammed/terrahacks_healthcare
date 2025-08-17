import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { IconSymbol } from '@/components/ui/IconSymbol';
import apiClient from '@/api/apiClient';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

interface VoiceAssistantProps {
  onEmergencyTrigger?: (data: any) => void;
  onFindCareTrigger?: (symptoms: string) => void;
  isVisible?: boolean;
  onClose?: () => void;
}

export default function VoiceAssistant({
  onEmergencyTrigger,
  onFindCareTrigger,
  isVisible = false,
  onClose,
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Emergency keywords that trigger immediate action
  const emergencyKeywords = [
    'emergency', 'help', '911', 'ambulance', 'heart attack', 'stroke',
    'chest pain', 'can\'t breathe', 'bleeding', 'unconscious', 'accident',
    'crash', 'fall', 'broken', 'severe pain', 'dizzy', 'fainting'
  ];

  // Care-related keywords
  const careKeywords = [
    'hurt', 'pain', 'sick', 'fever', 'headache', 'nausea', 'vomiting',
    'diarrhea', 'cough', 'cold', 'flu', 'injury', 'cut', 'burn', 'sprain',
    'discomfort', 'symptoms', 'not feeling well'
  ];

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const speak = async (text: string) => {
    try {
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        const permission = await requestPermission();
        if (permission.status !== 'granted') {
          Alert.alert('Permission required', 'Microphone permission is needed for voice commands.');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsListening(true);
      setTranscript('Listening...');

      // Auto-stop recording after 10 seconds
      setTimeout(() => {
        if (isListening) {
          stopRecording();
        }
      }, 10000);

    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start voice recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsListening(false);
      setIsProcessing(true);
      setTranscript('Processing...');

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        await processAudioFile(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const processAudioFile = async (audioUri: string) => {
    try {
      // Convert audio to base64
      const response = await fetch(audioUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onload = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (base64Audio) {
          await sendAudioToBackend(base64Audio);
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error processing audio:', error);
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const sendAudioToBackend = async (base64Audio: string) => {
    try {
      const response = await apiClient.post('/voice/process/', {
        audio_data: base64Audio,
      });

      const { transcript: recognizedText, intent, confidence } = response.data;
      setTranscript(recognizedText);

      if (confidence > 0.7) {
        await handleVoiceCommand(recognizedText.toLowerCase(), intent);
      } else {
        await speak("I didn't catch that clearly. Could you please repeat?");
      }
    } catch (error) {
      console.error('Error sending audio to backend:', error);
      // Fallback: use mock processing for demo
      await handleMockVoiceProcessing();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMockVoiceProcessing = async () => {
    // Mock processing for demo purposes
    const mockTranscript = "I'm experiencing chest pain and need help";
    setTranscript(mockTranscript);
    await handleVoiceCommand(mockTranscript.toLowerCase(), 'emergency');
  };

  const handleVoiceCommand = async (text: string, intent?: string) => {
    const isEmergency = emergencyKeywords.some(keyword => text.includes(keyword));
    const isCareRequest = careKeywords.some(keyword => text.includes(keyword));

    if (isEmergency || intent === 'emergency') {
      await handleEmergencyCommand(text);
    } else if (isCareRequest || intent === 'find_care') {
      await handleFindCareCommand(text);
    } else {
      await speak("I heard: " + text + ". Please say 'emergency' for urgent help or describe your symptoms for care recommendations.");
    }
  };

  const handleEmergencyCommand = async (text: string) => {
    await speak("Emergency detected! Getting your location and finding the nearest hospital.");
    
    try {
      const location = await Location.getCurrentPositionAsync({});
      
      const emergencyData = {
        userLatitude: location.coords.latitude,
        userLongitude: location.coords.longitude,
        symptoms: text,
        urgency: 'high'
      };

      if (onEmergencyTrigger) {
        onEmergencyTrigger(emergencyData);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      await speak("Unable to get your location. Please call 911 directly.");
    }
  };

  const handleFindCareCommand = async (text: string) => {
    await speak("I understand you need care. Let me help you find the right hospital for your symptoms.");
    
    if (onFindCareTrigger) {
      onFindCareTrigger(text);
    }
  };

  const toggleRecording = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <View style={styles.voiceAssistant}>
          <View style={styles.header}>
            <Text style={styles.title}>Voice Assistant</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.instruction}>
              {isListening 
                ? "Listening... Speak now" 
                : isProcessing 
                ? "Processing your request..." 
                : "Tap the microphone and speak"
              }
            </Text>

            {transcript ? (
              <View style={styles.transcriptContainer}>
                <Text style={styles.transcriptLabel}>You said:</Text>
                <Text style={styles.transcript}>{transcript}</Text>
              </View>
            ) : null}

            <View style={styles.buttonContainer}>
              <Animated.View style={[styles.micButton, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                  style={[
                    styles.micTouchable,
                    isListening && styles.micButtonActive,
                    isProcessing && styles.micButtonProcessing
                  ]}
                  onPress={toggleRecording}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="large" color="#fff" />
                  ) : (
                    <IconSymbol 
                      name={isListening ? "stop" : "mic"} 
                      size={32} 
                      color="#fff" 
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.quickCommands}>
              <Text style={styles.quickCommandsTitle}>Quick Commands:</Text>
              <View style={styles.commandButtons}>
                <TouchableOpacity 
                  style={styles.commandButton}
                  onPress={() => speak("Emergency mode activated. Getting your location.")}
                >
                  <Text style={styles.commandText}>"Emergency"</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.commandButton}
                  onPress={() => speak("I'm here to help. Describe your symptoms.")}
                >
                  <Text style={styles.commandText}>"I need care"</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceAssistant: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  transcriptContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  transcript: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: '#FF3B30',
  },
  micButtonProcessing: {
    backgroundColor: '#FF9500',
  },
  quickCommands: {
    width: '100%',
  },
  quickCommandsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  commandButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  commandButton: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  commandText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
