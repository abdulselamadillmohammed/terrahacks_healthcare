// File: app/(hospital)/_layout.tsx
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function HospitalTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#16a34a", // Hospital green theme
        tabBarInactiveTintColor: "#64748b",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
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
        name="queue"
        options={{
          title: "Patient Queue",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="list.bullet.clipboard.fill"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.badge.plus.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hospital Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="building.2.crop.circle.fill"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
