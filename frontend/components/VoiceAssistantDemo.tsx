import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useVoiceAssistantContext } from './VoiceAssistantProvider';

export default function VoiceAssistantDemo() {
  const { speak, showVoiceAssistant } = useVoiceAssistantContext();
  const [demoMode, setDemoMode] = useState(false);

  const demoCommands = [
    {
      title: "Emergency Commands",
      commands: [
        "I'm having chest pain",
        "Help, I can't breathe",
        "Emergency, I need an ambulance",
        "I think I'm having a heart attack",
        "I fell and hurt myself badly"
      ]
    },
    {
      title: "Care Request Commands",
      commands: [
        "I have a fever and headache",
        "My hand is cut and bleeding",
        "I feel dizzy and nauseous",
        "I have a severe headache",
        "I think I sprained my ankle"
      ]
    },
    {
      title: "General Health Commands",
      commands: [
        "I'm not feeling well",
        "I have a cold and cough",
        "I have stomach pain",
        "I need medical attention",
        "I'm experiencing symptoms"
      ]
    }
  ];

  const handleDemoCommand = async (command: string) => {
    try {
      await speak(`Demo mode: You said "${command}". In a real scenario, this would trigger the appropriate action.`);
      
      // Simulate different responses based on command type
      if (command.toLowerCase().includes('chest pain') || command.toLowerCase().includes('heart attack')) {
        setTimeout(() => {
          speak("This would trigger emergency dispatch to find the nearest cardiac care facility.");
        }, 2000);
      } else if (command.toLowerCase().includes('fever') || command.toLowerCase().includes('headache')) {
        setTimeout(() => {
          speak("This would trigger a care request to find appropriate medical facilities.");
        }, 2000);
      }
    } catch (error) {
      console.error('Demo command error:', error);
    }
  };

  const startVoiceAssistant = () => {
    showVoiceAssistant();
  };

  const toggleDemoMode = () => {
    setDemoMode(!demoMode);
    if (!demoMode) {
      speak("Demo mode activated. You can test voice commands without actual voice input.");
    } else {
      speak("Demo mode deactivated.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Assistant Demo</Text>
        <Text style={styles.subtitle}>
          Test the voice assistant functionality
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={startVoiceAssistant}
        >
          <IconSymbol name="mic" size={24} color="#fff" />
          <Text style={styles.primaryButtonText}>Open Voice Assistant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, demoMode && styles.activeButton]}
          onPress={toggleDemoMode}
        >
          <Text style={[styles.secondaryButtonText, demoMode && styles.activeButtonText]}>
            {demoMode ? 'Demo Mode: ON' : 'Demo Mode: OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {demoMode && (
        <ScrollView style={styles.demoContainer}>
          <Text style={styles.demoTitle}>Demo Commands</Text>
          <Text style={styles.demoDescription}>
            Tap any command to hear how the voice assistant would respond:
          </Text>

          {demoCommands.map((category, categoryIndex) => (
            <View key={categoryIndex} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              {category.commands.map((command, commandIndex) => (
                <TouchableOpacity
                  key={commandIndex}
                  style={styles.commandButton}
                  onPress={() => handleDemoCommand(command)}
                >
                  <Text style={styles.commandText}>{command}</Text>
                  <IconSymbol name="play" size={16} color="#007AFF" />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>How it works:</Text>
        <Text style={styles.infoText}>
          • Tap the floating microphone button to activate voice assistant{'\n'}
          • Speak your symptoms or emergency situation{'\n'}
          • The AI will classify your intent and route you appropriately{'\n'}
          • Perfect for hands-free operation when driving or injured
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#E5E5EA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  activeButton: {
    backgroundColor: '#34C759',
  },
  activeButtonText: {
    color: '#fff',
  },
  demoContainer: {
    flex: 1,
    marginBottom: 20,
  },
  demoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  demoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  commandButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  commandText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
