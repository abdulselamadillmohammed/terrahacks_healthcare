import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';

interface VoiceAssistantState {
  isVisible: boolean;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
}

export const useVoiceAssistant = () => {
  const [state, setState] = useState<VoiceAssistantState>({
    isVisible: false,
    isListening: false,
    isProcessing: false,
    transcript: '',
  });

  const showVoiceAssistant = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: true }));
  }, []);

  const hideVoiceAssistant = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isVisible: false,
      isListening: false,
      isProcessing: false,
      transcript: ''
    }));
  }, []);

  const updateState = useCallback((updates: Partial<VoiceAssistantState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleEmergencyTrigger = useCallback(async (data: any) => {
    try {
      // Navigate to emergency dispatch with voice data
      const params = {
        userLatitude: data.userLatitude.toString(),
        userLongitude: data.userLongitude.toString(),
        symptoms: data.symptoms,
        source: 'voice_assistant'
      };

      router.push({
        pathname: '/emergency-dispatch',
        params
      });

      hideVoiceAssistant();
    } catch (error) {
      console.error('Error handling emergency trigger:', error);
    }
  }, [hideVoiceAssistant]);

  const handleFindCareTrigger = useCallback(async (symptoms: string) => {
    try {
      // Navigate to recommendation page with voice symptoms
      const params = {
        symptoms: symptoms,
        source: 'voice_assistant'
      };

      router.push({
        pathname: '/recommendation',
        params
      });

      hideVoiceAssistant();
    } catch (error) {
      console.error('Error handling find care trigger:', error);
    }
  }, [hideVoiceAssistant]);

  const speak = useCallback(async (text: string) => {
    try {
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Speech error:', error);
    }
  }, []);

  return {
    ...state,
    showVoiceAssistant,
    hideVoiceAssistant,
    updateState,
    handleEmergencyTrigger,
    handleFindCareTrigger,
    speak,
  };
};
