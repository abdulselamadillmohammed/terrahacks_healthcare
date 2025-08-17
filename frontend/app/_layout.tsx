// File: app/_layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import VoiceAssistantProvider from "@/components/VoiceAssistantProvider";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <VoiceAssistantProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* Authentication screens */}
          <Stack.Screen name="auth" />

          {/* Main app tabs */}
          <Stack.Screen name="(tabs)" />

          {/* 404 screen */}
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </VoiceAssistantProvider>
    </ThemeProvider>
  );
}
