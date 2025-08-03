// File: app/hospital/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function HospitalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f8fafe" },
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: "Hospital Dashboard",
        }}
      />
    </Stack>
  );
}
