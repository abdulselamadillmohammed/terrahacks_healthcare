// File: app/(hospital)/queue.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/ui/IconSymbol";
import apiClient from "../../api/apiClient";

interface MedicalProfile {
  date_of_birth: string;
  address: string;
  allergies: string;
  pre_existing_conditions: string;
  emergency_notes: string;
}

interface Patient {
  id: number;
  username: string;
  email: string;
  medical_profile: MedicalProfile;
}

interface QueueEntry {
  id: number;
  patient: Patient;
  hospital_name: string;
  admitted_at: string;
  updated_at: string;
  priority_score: number;
  estimated_service_time: number;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  notes: string;
}

export default function HospitalQueueScreen() {
  const [queueData, setQueueData] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<QueueEntry | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPriority, setEditingPriority] = useState("");
  const [editingTime, setEditingTime] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  // Fetch queue data
  const fetchQueueData = async () => {
    try {
      const response = await apiClient.get("/hospital/queue/");
      setQueueData(response.data);
      console.log("Queue data loaded:", response.data);
    } catch (error) {
      console.error("Failed to fetch queue data:", error);
      Alert.alert("Error", "Failed to load patient queue");
    }
  };

  // Load data on screen focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchQueueData().finally(() => setLoading(false));
    }, [])
  );

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQueueData();
    setRefreshing(false);
  };

  // Get priority color and label
  const getPriorityInfo = (priority: number) => {
    if (priority >= 8)
      return { color: "#dc2626", label: "Critical", bgColor: "#fef2f2" };
    if (priority >= 6)
      return { color: "#ea580c", label: "High", bgColor: "#fff7ed" };
    if (priority >= 4)
      return { color: "#f59e0b", label: "Medium", bgColor: "#fefbeb" };
    return { color: "#16a34a", label: "Low", bgColor: "#f0fdf4" };
  };

  // Get status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "waiting":
        return { color: "#3b82f6", label: "Waiting", bgColor: "#eff6ff" };
      case "in_progress":
        return { color: "#f59e0b", label: "In Progress", bgColor: "#fefbeb" };
      case "completed":
        return { color: "#16a34a", label: "Completed", bgColor: "#f0fdf4" };
      case "cancelled":
        return { color: "#6b7280", label: "Cancelled", bgColor: "#f9fafb" };
      default:
        return { color: "#6b7280", label: "Unknown", bgColor: "#f9fafb" };
    }
  };

  // Open patient detail modal
  const openPatientDetail = (patient: QueueEntry) => {
    setSelectedPatient(patient);
    setEditingPriority(patient.priority_score.toString());
    setEditingTime(patient.estimated_service_time.toString());
    setEditingNotes(patient.notes || "");
    setEditingStatus(patient.status);
    setModalVisible(true);
  };

  // Update patient in queue
  const updatePatient = async () => {
    if (!selectedPatient) return;

    const priority = parseInt(editingPriority);
    const time = parseInt(editingTime);

    if (isNaN(priority) || priority < 1 || priority > 10) {
      Alert.alert("Error", "Priority must be between 1 and 10");
      return;
    }

    if (isNaN(time) || time < 5) {
      Alert.alert("Error", "Service time must be at least 5 minutes");
      return;
    }

    setUpdating(true);

    try {
      const updateData = {
        priority_score: priority,
        estimated_service_time: time,
        status: editingStatus,
        notes: editingNotes.trim(),
      };

      await apiClient.patch(
        `/hospital/queue/${selectedPatient.id}/update/`,
        updateData
      );

      Alert.alert("Success", "Patient information updated successfully");
      setModalVisible(false);
      await fetchQueueData(); // Refresh the list
    } catch (error: any) {
      console.error("Update failed:", error.response?.data);
      Alert.alert("Error", "Failed to update patient information");
    } finally {
      setUpdating(false);
    }
  };

  // Render queue item
  const renderQueueItem = ({ item }: { item: QueueEntry }) => {
    const priorityInfo = getPriorityInfo(item.priority_score);
    const statusInfo = getStatusInfo(item.status);
    const admittedTime = new Date(item.admitted_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <TouchableOpacity
        style={styles.queueItem}
        onPress={() => openPatientDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patient.username}</Text>
            <Text style={styles.admittedTime}>Admitted: {admittedTime}</Text>
          </View>

          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priorityInfo.bgColor },
              ]}
            >
              <Text
                style={[styles.priorityText, { color: priorityInfo.color }]}
              >
                P{item.priority_score} {priorityInfo.label}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusInfo.bgColor },
              ]}
            >
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailItem}>
            <IconSymbol name="clock.fill" size={16} color="#64748b" />
            <Text style={styles.detailText}>
              {item.estimated_service_time} min
            </Text>
          </View>

          {item.patient.medical_profile?.emergency_notes && (
            <View style={styles.detailItem}>
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={16}
                color="#ea580c"
              />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.patient.medical_profile.emergency_notes}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>Tap for details</Text>
          <IconSymbol name="chevron.right" size={16} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    );
  };

  // Render patient detail modal
  const renderPatientModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <IconSymbol name="xmark" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <>
                {/* Patient Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Patient Information</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Name:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPatient.patient.username}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Email:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPatient.patient.email}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Date of Birth:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPatient.patient.medical_profile
                          ?.date_of_birth || "Not provided"}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Address:</Text>
                      <Text style={styles.infoValue}>
                        {selectedPatient.patient.medical_profile?.address ||
                          "Not provided"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Medical Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Medical History</Text>
                  <View style={styles.medicalInfo}>
                    <Text style={styles.medicalLabel}>Allergies:</Text>
                    <Text style={styles.medicalValue}>
                      {selectedPatient.patient.medical_profile?.allergies ||
                        "None listed"}
                    </Text>

                    <Text style={styles.medicalLabel}>
                      Pre-existing Conditions:
                    </Text>
                    <Text style={styles.medicalValue}>
                      {selectedPatient.patient.medical_profile
                        ?.pre_existing_conditions || "None listed"}
                    </Text>

                    <Text style={styles.medicalLabel}>Emergency Notes:</Text>
                    <Text style={styles.medicalValue}>
                      {selectedPatient.patient.medical_profile
                        ?.emergency_notes || "None provided"}
                    </Text>
                  </View>
                </View>

                {/* Editable Queue Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Queue Management</Text>

                  <View style={styles.editableSection}>
                    <Text style={styles.inputLabel}>Priority Score (1-10)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingPriority}
                      onChangeText={setEditingPriority}
                      keyboardType="numeric"
                      placeholder="1-10"
                    />
                  </View>

                  <View style={styles.editableSection}>
                    <Text style={styles.inputLabel}>
                      Estimated Service Time (minutes)
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={editingTime}
                      onChangeText={setEditingTime}
                      keyboardType="numeric"
                      placeholder="Minutes"
                    />
                  </View>

                  <View style={styles.editableSection}>
                    <Text style={styles.inputLabel}>Status</Text>
                    <View style={styles.statusSelector}>
                      {["waiting", "in_progress", "completed", "cancelled"].map(
                        (status) => (
                          <TouchableOpacity
                            key={status}
                            style={[
                              styles.statusOption,
                              editingStatus === status &&
                                styles.statusOptionActive,
                            ]}
                            onPress={() => setEditingStatus(status)}
                          >
                            <Text
                              style={[
                                styles.statusOptionText,
                                editingStatus === status &&
                                  styles.statusOptionTextActive,
                              ]}
                            >
                              {getStatusInfo(status).label}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>

                  <View style={styles.editableSection}>
                    <Text style={styles.inputLabel}>Staff Notes</Text>
                    <TextInput
                      style={styles.textArea}
                      value={editingNotes}
                      onChangeText={setEditingNotes}
                      placeholder="Additional notes..."
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      updating && styles.saveButtonDisabled,
                    ]}
                    onPress={updatePatient}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading patient queue...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patient Queue</Text>
        <View style={styles.queueStats}>
          <Text style={styles.queueCount}>{queueData.length} patients</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <IconSymbol name="arrow.clockwise" size={20} color="#16a34a" />
          </TouchableOpacity>
        </View>
      </View>

      {queueData.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="list.bullet.clipboard" size={64} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No patients in queue</Text>
          <Text style={styles.emptySubtitle}>
            Patients will appear here when they're admitted to your hospital
          </Text>
        </View>
      ) : (
        <FlatList
          data={queueData}
          renderItem={renderQueueItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderPatientModal()}

      {/* Bottom padding for tab bar */}
      <View style={styles.tabBarPadding} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafe",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafe",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
  },
  queueStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  queueCount: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  queueItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  admittedTime: {
    fontSize: 14,
    color: "#64748b",
  },
  badgeContainer: {
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-end",
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-end",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  itemDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#4b5563",
    flex: 1,
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  tapHintText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  tabBarPadding: {
    height: 120,
    backgroundColor: "transparent",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  closeButton: {
    padding: 8,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  infoGrid: {
    gap: 8,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  infoValue: {
    fontSize: 14,
    color: "#1e293b",
    flex: 1,
    textAlign: "right",
  },
  medicalInfo: {
    gap: 12,
  },
  medicalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  medicalValue: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
  },
  editableSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1e293b",
    textAlignVertical: "top",
    minHeight: 80,
  },
  statusSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  statusOptionActive: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  statusOptionText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  statusOptionTextActive: {
    color: "#ffffff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#16a34a",
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
  },
});
