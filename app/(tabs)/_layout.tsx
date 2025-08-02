// File: app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import React, { useState, useEffect } from "react";
import { Platform, DeviceEventEmitter } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [hideTabBar, setHideTabBar] = useState(false);

  useEffect(() => {
    // Listen for events to show/hide tab bar
    const showTabsListener = DeviceEventEmitter.addListener(
      "showTabBar",
      () => {
        setHideTabBar(false);
      }
    );

    const hideTabsListener = DeviceEventEmitter.addListener(
      "hideTabBar",
      () => {
        setHideTabBar(true);
      }
    );

    return () => {
      showTabsListener.remove();
      hideTabsListener.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2c5aa0", // VitalLink primary blue
        tabBarInactiveTintColor: "#64748b",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: hideTabBar
          ? { display: "none" }
          : Platform.select({
              ios: {
                position: "absolute",
              },
              default: {
                backgroundColor: "#ffffff",
                borderTopWidth: 1,
                borderTopColor: "#e2e8f0",
              },
            }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Emergency",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="exclamationmark.triangle.fill"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="person.crop.circle.fill"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Health Tips",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="heart.text.square.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
