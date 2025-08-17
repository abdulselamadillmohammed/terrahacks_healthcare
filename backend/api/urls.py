# Updated api/urls.py file

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    # Authentication & Registration
    RegisterView,
    UserProfileView,
    UserUpdateView,
    
    # Patient Views
    MedicalProfileView,
    EmergencyCallView,
    ChatbotView,
    
    # Hospital Views
    HospitalProfileUpdateView,
    PatientQueueListView,
    AdmitPatientView,
    UpdatePatientInQueueView,

    PublicHospitalListView,
    
    # NEW: Emergency Dispatch & Hospital Request Views
    EmergencyDispatchView,
    RequestAdmissionView,
    HospitalRequestsListView,
    AcceptHospitalRequestView,
    RejectHospitalRequestView,
    
    # Voice Processing
    VoiceProcessView,
)

urlpatterns = [
    # Authentication & Registration
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User Management (Both user types)
    path('user/profile/', UserProfileView.as_view(), name='user_profile_basic'),
    path('user/update/', UserUpdateView.as_view(), name='user_update'),
    
    # Patient Endpoints
    path('profile/', MedicalProfileView.as_view(), name='medical_profile'),  # Patients only
    path('emergency-call/', EmergencyCallView.as_view(), name='emergency_call'),
    path('chatbot/', ChatbotView.as_view(), name='chatbot'),
    
    # NEW: Enhanced Emergency & Admission Endpoints
    path('emergency/dispatch/', EmergencyDispatchView.as_view(), name='emergency_dispatch'),
    path('request-admission/', RequestAdmissionView.as_view(), name='request_admission'),
    
    # Voice Processing
    path('voice/process/', VoiceProcessView.as_view(), name='voice_process'),
    
    # Hospital Dashboard Endpoints
    path('hospital/profile/', HospitalProfileUpdateView.as_view(), name='hospital_profile_update'),
    path('hospital/queue/', PatientQueueListView.as_view(), name='hospital_queue_list'),
    path('hospital/queue/admit/', AdmitPatientView.as_view(), name='hospital_admit_patient'),
    path('hospital/queue/<int:pk>/update/', UpdatePatientInQueueView.as_view(), name='hospital_update_patient_in_queue'),
    
    # NEW: Hospital Request Management Endpoints
    path('hospital/requests/', HospitalRequestsListView.as_view(), name='hospital_requests_list'),
    path('hospital/requests/<int:request_id>/accept/', AcceptHospitalRequestView.as_view(), name='accept_hospital_request'),
    path('hospital/requests/<int:request_id>/reject/', RejectHospitalRequestView.as_view(), name='reject_hospital_request'),
    
    # Public hospital list for map
    path('hospitals/', PublicHospitalListView.as_view(), name='public_hospital_list'),
]