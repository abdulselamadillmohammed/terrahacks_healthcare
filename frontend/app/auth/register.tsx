// File: app/auth/register.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { IconSymbol } from "@/components/ui/IconSymbol";
import apiClient from "../../api/apiClient";

type UserType = "patient" | "hospital";

interface PatientFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
}

interface HospitalFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  hospital_name: string;
  address: string;
  phone_number: string;
}

export default function RegisterScreen() {
  const [userType, setUserType] = useState<UserType>("patient");
  const [patientData, setPatientData] = useState<PatientFormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
  });
  const [hospitalData, setHospitalData] = useState<HospitalFormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    hospital_name: "",
    address: "",
    phone_number: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handlePatientInputChange = (
    field: keyof PatientFormData,
    value: string
  ) => {
    setPatientData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleHospitalInputChange = (
    field: keyof HospitalFormData,
    value: string
  ) => {
    setHospitalData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validatePatientForm = () => {
    const { username, email, password, confirmPassword, dateOfBirth } =
      patientData;

    if (
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !dateOfBirth.trim()
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateOfBirth)) {
      Alert.alert("Error", "Please enter date in YYYY-MM-DD format");
      return false;
    }

    return true;
  };

  const validateHospitalForm = () => {
    const {
      username,
      email,
      password,
      confirmPassword,
      hospital_name,
      address,
      phone_number,
    } = hospitalData;

    if (
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !hospital_name.trim() ||
      !address.trim() ||
      !phone_number.trim()
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    // Basic phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone_number.replace(/[\s\-\(\)]/g, ""))) {
      Alert.alert("Error", "Please enter a valid phone number");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    // Validate based on user type
    if (userType === "patient" && !validatePatientForm()) return;
    if (userType === "hospital" && !validateHospitalForm()) return;

    setIsLoading(true);

    try {
      // Prepare registration payload based on user type
      let registrationPayload: any = {
        user_type: userType,
      };

      if (userType === "patient") {
        registrationPayload = {
          ...registrationPayload,
          username: patientData.username,
          email: patientData.email,
          password: patientData.password,
          date_of_birth: patientData.dateOfBirth,
        };
      } else {
        registrationPayload = {
          ...registrationPayload,
          username: hospitalData.username,
          email: hospitalData.email,
          password: hospitalData.password,
          hospital_name: hospitalData.hospital_name,
          address: hospitalData.address,
          phone_number: hospitalData.phone_number,
        };
      }

      console.log("Registration payload:", registrationPayload);

      // Register the user/hospital
      const registerResponse = await apiClient.post(
        "/register/",
        registrationPayload
      );
      console.log("Registration response:", registerResponse.data);

      if (userType === "patient") {
        // Auto-login for patients
        const loginResponse = await apiClient.post("/token/", {
          username: patientData.username,
          password: patientData.password,
        });

        console.log("Auto-login response:", loginResponse.data);

        // Store tokens using SecureStore
        await SecureStore.setItemAsync(
          "accessToken",
          loginResponse.data.access
        );
        await SecureStore.setItemAsync(
          "refreshToken",
          loginResponse.data.refresh
        );

        console.log("Tokens saved successfully to SecureStore!");

        Alert.alert(
          "Welcome to VitaLink!",
          "Your account has been created. Let's set up your medical profile next.",
          [
            {
              text: "Continue",
              onPress: () => router.replace("/(tabs)/profile"),
            },
          ]
        );
      } else {
        // Redirect hospitals to pending verification screen
        router.replace("/auth/pending-verification");
      }
    } catch (error: any) {
      console.error("Registration error:", error.response?.data);

      let errorMessage = "Registration failed. Please try again.";
      if (error.response?.data?.email) {
        errorMessage = "This email is already registered.";
      } else if (error.response?.data?.username) {
        errorMessage = "This username is already taken.";
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserTypeSelector = () => (
    <View style={styles.userTypeContainer}>
      <Text style={styles.userTypeTitle}>I am registering as:</Text>
      <View style={styles.userTypeButtons}>
        <TouchableOpacity
          style={[
            styles.userTypeButton,
            userType === "patient" && styles.userTypeButtonActive,
          ]}
          onPress={() => setUserType("patient")}
        >
          <IconSymbol
            name="person.crop.circle.fill"
            size={32}
            color={userType === "patient" ? "#ffffff" : "#2c5aa0"}
          />
          <Text
            style={[
              styles.userTypeButtonText,
              userType === "patient" && styles.userTypeButtonTextActive,
            ]}
          >
            Patient
          </Text>
          <Text
            style={[
              styles.userTypeButtonSubtext,
              userType === "patient" && styles.userTypeButtonSubtextActive,
            ]}
          >
            Individual seeking emergency medical care
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.userTypeButton,
            userType === "hospital" && styles.userTypeButtonActive,
          ]}
          onPress={() => setUserType("hospital")}
        >
          <IconSymbol
            name="cross.fill"
            size={32}
            color={userType === "hospital" ? "#ffffff" : "#16a34a"}
          />
          <Text
            style={[
              styles.userTypeButtonText,
              userType === "hospital" && styles.userTypeButtonTextActive,
            ]}
          >
            Hospital
          </Text>
          <Text
            style={[
              styles.userTypeButtonSubtext,
              userType === "hospital" && styles.userTypeButtonSubtextActive,
            ]}
          >
            Medical facility providing emergency services
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPatientForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          style={styles.input}
          value={patientData.username}
          onChangeText={(value) => handlePatientInputChange("username", value)}
          placeholder="Choose a username"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          value={patientData.email}
          onChangeText={(value) => handlePatientInputChange("email", value)}
          placeholder="your.email@example.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Date of Birth *</Text>
        <TextInput
          style={styles.input}
          value={patientData.dateOfBirth}
          onChangeText={(value) =>
            handlePatientInputChange("dateOfBirth", value)
          }
          placeholder="YYYY-MM-DD (e.g., 1990-06-15)"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
        <Text style={styles.helpText}>
          This helps medical professionals provide age-appropriate care
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={patientData.password}
          onChangeText={(value) => handlePatientInputChange("password", value)}
          placeholder="Create a secure password"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password *</Text>
        <TextInput
          style={styles.input}
          value={patientData.confirmPassword}
          onChangeText={(value) =>
            handlePatientInputChange("confirmPassword", value)
          }
          placeholder="Re-enter your password"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
        />
      </View>
    </>
  );

  const renderHospitalForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username *</Text>
        <TextInput
          style={styles.input}
          value={hospitalData.username}
          onChangeText={(value) => handleHospitalInputChange("username", value)}
          placeholder="Choose a username"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          value={hospitalData.email}
          onChangeText={(value) => handleHospitalInputChange("email", value)}
          placeholder="hospital@example.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Hospital Name *</Text>
        <TextInput
          style={styles.input}
          value={hospitalData.hospital_name}
          onChangeText={(value) =>
            handleHospitalInputChange("hospital_name", value)
          }
          placeholder="General Hospital"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Hospital Address *</Text>
        <TextInput
          style={styles.textArea}
          value={hospitalData.address}
          onChangeText={(value) => handleHospitalInputChange("address", value)}
          placeholder="123 Medical Center Dr, City, State, ZIP"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          value={hospitalData.phone_number}
          onChangeText={(value) =>
            handleHospitalInputChange("phone_number", value)
          }
          placeholder="+1 (555) 123-4567"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={hospitalData.password}
          onChangeText={(value) => handleHospitalInputChange("password", value)}
          placeholder="Create a secure password"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password *</Text>
        <TextInput
          style={styles.input}
          value={hospitalData.confirmPassword}
          onChangeText={(value) =>
            handleHospitalInputChange("confirmPassword", value)
          }
          placeholder="Re-enter your password"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
        />
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.appName}>VitaLink</Text>
          <Text style={styles.tagline}>Your lifeline in emergencies</Text>
        </View>

        {renderUserTypeSelector()}

        <View style={styles.card}>
          <Text style={styles.title}>
            Create {userType === "patient" ? "Patient" : "Hospital"} Account
          </Text>
          <Text style={styles.subtitle}>
            {userType === "patient"
              ? "Join VitaLink to ensure help reaches you faster in emergencies"
              : "Register your hospital to provide emergency medical services"}
          </Text>

          {userType === "patient" ? renderPatientForm() : renderHospitalForm()}

          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>
                {userType === "patient"
                  ? "Create Account"
                  : "Submit for Review"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <View style={styles.privacyNotice}>
          <Text style={styles.privacyText}>
            {userType === "patient"
              ? "🔒 Your medical information is encrypted and only shared with emergency responders when you trigger an emergency call."
              : "⚕️ Hospital accounts require administrator verification before activation. You will be notified once your account is approved."}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafe",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2c5aa0",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  userTypeContainer: {
    marginBottom: 24,
  },
  userTypeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 16,
  },
  userTypeButtons: {
    flexDirection: "row",
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minHeight: 120,
  },
  userTypeButtonActive: {
    borderColor: "#2c5aa0",
    backgroundColor: "#2c5aa0",
  },
  userTypeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 8,
    marginBottom: 4,
  },
  userTypeButtonTextActive: {
    color: "#ffffff",
  },
  userTypeButtonSubtext: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 16,
  },
  userTypeButtonSubtextActive: {
    color: "#ffffff",
    opacity: 0.9,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    textAlignVertical: "top",
    minHeight: 80,
  },
  helpText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    fontStyle: "italic",
  },
  registerButton: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: "#94a3b8",
  },
  registerButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: "#64748b",
  },
  loginLink: {
    fontSize: 14,
    color: "#2c5aa0",
    fontWeight: "600",
  },
  privacyNotice: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  privacyText: {
    fontSize: 14,
    color: "#0c4a6e",
    textAlign: "center",
    lineHeight: 20,
  },
});
