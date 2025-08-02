// // Temporary debug file to clear all tokens
// // Create this file: app/debug-clear-tokens.tsx
// // Run this once to clear any old/invalid tokens

// import React from "react";
// import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
// import * as SecureStore from "expo-secure-store";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { router } from "expo-router";

// export default function DebugClearTokens() {
//   const clearAllTokens = async () => {
//     try {
//       // Clear from SecureStore
//       await SecureStore.deleteItemAsync("accessToken").catch(() => {});
//       await SecureStore.deleteItemAsync("refreshToken").catch(() => {});

//       // Clear from AsyncStorage (just in case)
//       await AsyncStorage.removeItem("access_token").catch(() => {});
//       await AsyncStorage.removeItem("refresh_token").catch(() => {});

//       console.log("All tokens cleared successfully!");
//       Alert.alert("Success", "All tokens cleared. You can now log in fresh.", [
//         { text: "Go to Login", onPress: () => router.replace("/auth/login") },
//       ]);
//     } catch (error) {
//       console.error("Error clearing tokens:", error);
//       Alert.alert("Done", "Attempted to clear all tokens.");
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Debug: Clear Tokens</Text>
//       <Text style={styles.subtitle}>
//         This will clear all stored authentication tokens
//       </Text>
//       <TouchableOpacity style={styles.button} onPress={clearAllTokens}>
//         <Text style={styles.buttonText}>Clear All Tokens</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20,
//     backgroundColor: "#f8fafe",
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: "bold",
//     marginBottom: 16,
//     color: "#1e293b",
//   },
//   subtitle: {
//     fontSize: 16,
//     textAlign: "center",
//     marginBottom: 32,
//     color: "#64748b",
//   },
//   button: {
//     backgroundColor: "#dc2626",
//     padding: 16,
//     borderRadius: 12,
//     minWidth: 200,
//     alignItems: "center",
//   },
//   buttonText: {
//     color: "#ffffff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });
