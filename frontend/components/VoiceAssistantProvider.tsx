import React, { createContext, useContext, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import VoiceAssistant from './VoiceAssistant';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';

const { width, height } = Dimensions.get('window');

interface VoiceAssistantContextType {
  showVoiceAssistant: () => void;
  hideVoiceAssistant: () => void;
  speak: (text: string) => Promise<void>;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export const useVoiceAssistantContext = () => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistantContext must be used within a VoiceAssistantProvider');
  }
  return context;
};

interface VoiceAssistantProviderProps {
  children: ReactNode;
}

export default function VoiceAssistantProvider({ children }: VoiceAssistantProviderProps) {
  const {
    isVisible,
    showVoiceAssistant,
    hideVoiceAssistant,
    handleEmergencyTrigger,
    handleFindCareTrigger,
    speak,
  } = useVoiceAssistant();

  const contextValue: VoiceAssistantContextType = {
    showVoiceAssistant,
    hideVoiceAssistant,
    speak,
  };

  return (
    <VoiceAssistantContext.Provider value={contextValue}>
      {children}
      
      {/* Floating Voice Assistant Button */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={showVoiceAssistant}
          activeOpacity={0.8}
        >
          <IconSymbol name="mic" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Voice Assistant Modal */}
      <VoiceAssistant
        isVisible={isVisible}
        onClose={hideVoiceAssistant}
        onEmergencyTrigger={handleEmergencyTrigger}
        onFindCareTrigger={handleFindCareTrigger}
      />
    </VoiceAssistantContext.Provider>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 999,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
