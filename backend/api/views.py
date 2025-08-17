# api/views.py
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from django.contrib.auth import get_user_model
from django.db.models import Sum, F, Value, IntegerField, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import datetime, timedelta

import os
import base64
import google.generativeai as genai
import json
import math
from dotenv import load_dotenv
# For MongoDB connection
from .mongo_client import get_db  # Make sure you have this function defined in api/db.py

# For permission control
from .permissions import IsPatient

# For voice processing
import speech_recognition as sr
from io import BytesIO
import tempfile

# Load environment variables
load_dotenv()

# Import models
from .models import CustomUser, MedicalProfile, HospitalProfile, PatientQueue, HospitalRequest

# Import serializers (consolidated - no duplicates)
from .serializers import (
    RegisterSerializer, UserSerializer, MedicalProfileSerializer, 
    HospitalProfileSerializer, PatientQueueSerializer, UserUpdateSerializer,
    HospitalMapSerializer, EmergencyDispatchSerializer, 
    AdmissionRequestSerializer, HospitalRequestSerializer
)

# Load environment variables
load_dotenv()

User = get_user_model()

# Custom permission classes
class IsVerifiedHospital(permissions.BasePermission):
    """Allows access only to verified hospital users."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.user_type == 'hospital' and 
            request.user.is_verified
        )

class IsPatient(permissions.BasePermission):
    """Allows access only to patient users."""
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.user_type == 'patient'
        )

# Voice Processing View
class VoiceProcessView(APIView):
    """Process voice audio and return transcript with intent classification"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    
    def post(self, request):
        try:
            audio_data = request.data.get('audio_data')
            if not audio_data:
                return Response(
                    {'error': 'No audio data provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Decode base64 audio data
            audio_bytes = base64.b64decode(audio_data)
            
            # Create temporary file for audio processing
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_file_path = temp_file.name

            # Initialize speech recognizer
            recognizer = sr.Recognizer()
            
            # Load audio file
            with sr.AudioFile(temp_file_path) as source:
                audio = recognizer.record(source)
                
                # Perform speech recognition
                try:
                    transcript = recognizer.recognize_google(audio)
                    
                    # Classify intent using Gemini AI
                    intent, confidence = self.classify_intent(transcript)
                    
                    # Clean up temporary file
                    os.unlink(temp_file_path)
                    
                    return Response({
                        'transcript': transcript,
                        'intent': intent,
                        'confidence': confidence
                    })
                    
                except sr.UnknownValueError:
                    os.unlink(temp_file_path)
                    return Response({
                        'transcript': '',
                        'intent': 'unknown',
                        'confidence': 0.0
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                except sr.RequestError as e:
                    os.unlink(temp_file_path)
                    return Response({
                        'error': f'Speech recognition service error: {str(e)}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
        except Exception as e:
            return Response({
                'error': f'Voice processing error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def classify_intent(self, transcript):
        """Use Gemini AI to classify the intent of the voice command"""
        try:
            # Configure Gemini AI
            genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
            model = genai.GenerativeModel('gemini-pro')
            
            prompt = f"""
            Analyze this voice transcript and classify the intent:
            Transcript: "{transcript}"
            
            Classify as one of:
            1. "emergency" - if it contains emergency keywords like: emergency, help, 911, ambulance, heart attack, stroke, chest pain, can't breathe, bleeding, unconscious, accident, crash, fall, broken, severe pain, dizzy, fainting
            2. "find_care" - if it contains care-related keywords like: hurt, pain, sick, fever, headache, nausea, vomiting, diarrhea, cough, cold, flu, injury, cut, burn, sprain, discomfort, symptoms, not feeling well
            3. "general" - for other general queries
            
            Return only the intent classification and confidence score (0.0-1.0) in this format:
            intent: [classification]
            confidence: [score]
            """
            
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Parse response
            lines = response_text.split('\n')
            intent = 'general'
            confidence = 0.5
            
            for line in lines:
                if line.startswith('intent:'):
                    intent = line.split(':')[1].strip()
                elif line.startswith('confidence:'):
                    try:
                        confidence = float(line.split(':')[1].strip())
                    except:
                        confidence = 0.5
            
            return intent, confidence
            
        except Exception as e:
            print(f"Error in intent classification: {e}")
            # Fallback classification
            transcript_lower = transcript.lower()
            
            emergency_keywords = [
                'emergency', 'help', '911', 'ambulance', 'heart attack', 'stroke',
                'chest pain', 'can\'t breathe', 'bleeding', 'unconscious', 'accident',
                'crash', 'fall', 'broken', 'severe pain', 'dizzy', 'fainting'
            ]
            
            care_keywords = [
                'hurt', 'pain', 'sick', 'fever', 'headache', 'nausea', 'vomiting',
                'diarrhea', 'cough', 'cold', 'flu', 'injury', 'cut', 'burn', 'sprain',
                'discomfort', 'symptoms', 'not feeling well'
            ]
            
            if any(keyword in transcript_lower for keyword in emergency_keywords):
                return 'emergency', 0.8
            elif any(keyword in transcript_lower for keyword in care_keywords):
                return 'find_care', 0.7
            else:
                return 'general', 0.5

# Authentication and Registration Views
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            if user.user_type == 'patient':
                return Response({
                    'message': 'Patient account created successfully',
                    'user_type': 'patient',
                    'username': user.username,
                    'email': user.email,
                    'id': user.id
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'message': 'Hospital registration submitted for review',
                    'user_type': 'hospital',
                    'username': user.username,
                    'email': user.email,
                    'status': 'pending_verification',
                    'id': user.id
                }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    """Basic user profile for login verification - works for both user types"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': user.user_type,
            'is_verified': user.is_verified,
        }
        
        if user.user_type == 'patient':
            try:
                medical_profile = user.medical_profile
                user_data['has_medical_profile'] = True
                user_data['medical_profile_complete'] = bool(
                    medical_profile.address and 
                    medical_profile.date_of_birth
                )
            except MedicalProfile.DoesNotExist:
                user_data['has_medical_profile'] = False
                user_data['medical_profile_complete'] = False
                
        elif user.user_type == 'hospital':
            try:
                hospital_profile = user.hospital_profile
                user_data['hospital_name'] = hospital_profile.hospital_name
                user_data['has_hospital_profile'] = True
            except HospitalProfile.DoesNotExist:
                user_data['has_hospital_profile'] = False
        
        return Response(user_data, status=status.HTTP_200_OK)

# Patient Views
class MedicalProfileView(generics.RetrieveUpdateAPIView):
    """Medical profile management for patients only"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsPatient]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return MedicalProfileSerializer
    
    def get(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    def get_object_for_update(self):
        user = self.request.user
        medical_profile, created = MedicalProfile.objects.get_or_create(user=user)
        return medical_profile
    
    def put(self, request, *args, **kwargs):
        medical_profile = self.get_object_for_update()
        serializer = MedicalProfileSerializer(medical_profile, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            user_serializer = UserSerializer(request.user)
            return Response(user_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserUpdateView(generics.UpdateAPIView):
    """Update user account information"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserUpdateSerializer
    
    def get_object(self):
        return self.request.user
    
    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            user_serializer = UserSerializer(user)
            return Response(user_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmergencyCallView(APIView):
    """Handle emergency calls (patients only)"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsPatient]

    def post(self, request, *args, **kwargs):
        user = request.user
        
        try:
            profile = user.medical_profile
            emergency_message = (
                f"EMERGENCY CALL for {user.username}. "
                f"Location: {profile.address or 'Not provided'}. "
                f"Allergies: {profile.allergies or 'None listed'}. "
                f"Pre-existing conditions: {profile.pre_existing_conditions or 'None listed'}. "
                f"Emergency notes: {profile.emergency_notes or 'None'}. "
                f"Date of birth: {profile.date_of_birth or 'Not provided'}."
            )
        except MedicalProfile.DoesNotExist:
            emergency_message = f"EMERGENCY CALL for {user.username}. No medical profile available."

        print(f"--- EMERGENCY TRIGGERED ---")
        print(emergency_message)
        print(f"--------------------------")
        
        return Response({
            "status": "emergency_call_initiated", 
            "message": emergency_message
        }, status=status.HTTP_200_OK)


class ChatbotView(APIView):
    """AI Chatbot with Gemini integration and MongoDB conversation history (Patients only)"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsPatient]

    def post(self, request):
        try:
            user = request.user
            db = get_db()

            # --- 1. Fetch Conversation History from MongoDB ---
            history_context = ""
            if db:
                summaries_collection = db.conversation_summaries
                past_summaries = summaries_collection.find({'user_id': user.id}).sort('_id', -1).limit(10)

                history = [
                    f"- User asked: '{s['prompt']}' and AI responded: '{s['response']}'"
                    for s in past_summaries
                ]
                if history:
                    history.reverse()  # Oldest to newest
                    history_context = "PREVIOUS CONVERSATION HISTORY:\n" + "\n".join(history)

            # --- 2. Prepare API Key and Prompt ---
            api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
            if not api_key:
                print("ERROR: No Gemini API key found")
                return Response({
                    'response': "AI service temporarily unavailable. Please try again later.",
                    'status': 'error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')

            prompt = request.data.get('prompt', '')
            system_prompt = request.data.get('system_prompt', 'You are a helpful medical AI assistant.')
            image_base64 = request.data.get('image_base64', '')
            image_mime_type = request.data.get('image_mime_type', '')

            if not prompt:
                return Response({'error': 'Prompt is required'}, status=status.HTTP_400_BAD_REQUEST)

            full_prompt = f"{system_prompt}\n\n{history_context}\n\nCURRENT QUESTION: {prompt}"
            content = [full_prompt]

            # --- 3. Include Image (if provided) ---
            if image_base64:
                try:
                    image_data = base64.b64decode(image_base64)
                    image_part = {
                        "mime_type": image_mime_type,
                        "data": image_data
                    }
                    content.append(image_part)
                except Exception as e:
                    print(f"Error processing image: {e}")

            # --- 4. Get Gemini Response ---
            response = model.generate_content(content)
            ai_response_text = response.text

            # --- 5. Save New Summary to MongoDB ---
            if db and ai_response_text:
                summaries_collection.insert_one({
                    'user_id': user.id,
                    'username': user.username,
                    'prompt': prompt,
                    'response': ai_response_text[:200],  # Only a snippet
                    'created_at': datetime.utcnow()
                })

            # --- 6. Return Response ---
            if ai_response_text:
                return Response({'response': ai_response_text, 'status': 'success'})
            else:
                return Response({
                    'response': "I couldn't generate a response. Please try rephrasing your question.",
                    'status': 'error'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            print(f"Gemini API Error: {e}")
            return Response({
                'response': "I'm experiencing technical difficulties. Please try again later.",
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class HospitalProfileUpdateView(generics.RetrieveUpdateAPIView):
    """Hospital profile management for verified hospitals"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsVerifiedHospital] # Assuming IsVerifiedHospital is defined elsewhere
    serializer_class = HospitalProfileSerializer # Assuming HospitalProfileSerializer is defined elsewhere

    def get_object(self):
        return self.request.user.hospital_profile


class PublicHospitalListView(generics.ListAPIView):
    """
    A public endpoint that lists all *verified* hospitals for the map.
    It calculates the current estimated wait time for each hospital.
    """
    permission_classes = [permissions.AllowAny]
    # Use the serializer we imported from the other file
    serializer_class = HospitalMapSerializer
    
    def get_queryset(self):
        """
        Builds the complex query to fetch hospitals and their calculated wait times.
        """
        try:
            # 1. Get all verified hospitals that have coordinates
            queryset = HospitalProfile.objects.filter(
                user__is_verified=True, 
                latitude__isnull=False, 
                longitude__isnull=False
            )

            # 2. Annotate the queryset with the calculated wait time
            queryset = queryset.annotate(
                current_wait_time=Coalesce(
                    Sum(
                        'patient_queue__estimated_service_time', 
                        filter=Q(patient_queue__status__in=['waiting', 'in_progress'])
                    ),
                    Value(0), # If the sum is Null (no patients), return 0
                    output_field=IntegerField()
                )
            )
            return queryset
        except Exception as e:
            # If any part of this complex query fails, log the error and return an empty list
            print(f"ERROR in PublicHospitalListView query: {e}")
            return HospitalProfile.objects.none()


class PatientQueueListView(generics.ListAPIView):
    """View current patient queue for hospital"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsVerifiedHospital]
    serializer_class = PatientQueueSerializer

    def get_queryset(self):
        hospital_profile = self.request.user.hospital_profile
        return PatientQueue.objects.filter(hospital=hospital_profile).select_related('patient__medical_profile')

class AdmitPatientView(APIView):
    """Admit a new patient to hospital queue with AI triage"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsVerifiedHospital]

    def post(self, request, *args, **kwargs):
        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response({'error': 'Patient ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            patient = User.objects.get(id=patient_id, user_type='patient')
        except User.DoesNotExist:
            return Response({'error': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)

        hospital_profile = request.user.hospital_profile
        
        # Check if patient is already in queue
        if PatientQueue.objects.filter(hospital=hospital_profile, patient=patient).exists():
            return Response({'error': 'Patient already in queue.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # AI Triage with Gemini
        priority = 5  # Default medium priority
        service_time = 30  # Default 30 minutes
        
        try:
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key and hasattr(patient, 'medical_profile'):
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                
                medical_profile = patient.medical_profile
                triage_prompt = f"""
                Analyze this patient's medical information and provide a JSON response with priority_score (1-10, where 10 is most urgent) and estimated_service_time (minutes).

                Patient Info:
                - Allergies: {medical_profile.allergies or 'None'}
                - Pre-existing conditions: {medical_profile.pre_existing_conditions or 'None'}
                - Emergency notes: {medical_profile.emergency_notes or 'None'}
                - Age: Calculate from DOB {medical_profile.date_of_birth or 'Unknown'}

                Respond only with valid JSON in this format:
                {{"priority_score": 5, "estimated_service_time": 30}}
                """
                
                response = model.generate_content(triage_prompt)
                
                try:
                    # Parse AI response
                    response_text = response.text.strip()
                    # Remove markdown code blocks if present
                    if '```' in response_text:
                        response_text = response_text.split('```')[1]
                        if response_text.startswith('json'):
                            response_text = response_text[4:]
                    
                    ai_data = json.loads(response_text)
                    priority = max(1, min(10, ai_data.get('priority_score', 5)))
                    service_time = max(5, min(180, ai_data.get('estimated_service_time', 30)))
                    
                    print(f"AI Triage Result - Priority: {priority}, Time: {service_time}")
                    
                except (json.JSONDecodeError, KeyError) as e:
                    print(f"AI Triage parsing error: {e}, using defaults")
                    
        except Exception as e:
            print(f"AI Triage Error: {e}, using defaults")

        # Create queue entry
        queue_entry = PatientQueue.objects.create(
            hospital=hospital_profile,
            patient=patient,
            priority_score=priority,
            estimated_service_time=service_time
        )
        
        serializer = PatientQueueSerializer(queue_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UpdatePatientInQueueView(generics.UpdateAPIView):
    """Update patient details in queue"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsVerifiedHospital]
    serializer_class = PatientQueueSerializer

    def get_queryset(self):
        return PatientQueue.objects.filter(hospital=self.request.user.hospital_profile)

    def get_object(self):
        queryset = self.get_queryset()
        pk = self.kwargs.get('pk')
        try:
            return queryset.get(pk=pk)
        except PatientQueue.DoesNotExist:
            return Response({'error': 'Patient queue entry not found.'}, status=status.HTTP_404_NOT_FOUND)


# Add these imports and views to your existing api/views.py file
class EmergencyDispatchView(APIView):
    """AI-powered emergency dispatch system"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsPatient]

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c

    def calculate_travel_time(self, distance_km):
        """Calculate travel time assuming emergency vehicle speed"""
        emergency_speed_kmh = 60  # Emergency vehicles average speed
        return math.ceil((distance_km / emergency_speed_kmh) * 60)  # Convert to minutes

    def post(self, request):
        try:
            user = request.user
            latitude = float(request.data.get('latitude'))
            longitude = float(request.data.get('longitude'))
            
            if not latitude or not longitude:
                return Response({'error': 'Patient location is required'}, status=status.HTTP_400_BAD_REQUEST)

            # Get patient's medical profile
            try:
                medical_profile = user.medical_profile
            except MedicalProfile.DoesNotExist:
                medical_profile = None

            # Get all verified hospitals with their current wait times
            hospitals_queryset = HospitalProfile.objects.filter(
                user__is_verified=True,
                latitude__isnull=False,
                longitude__isnull=False
            ).annotate(
                current_wait_time=Coalesce(
                    Sum(
                        'patient_queue__estimated_service_time',
                        filter=Q(patient_queue__status__in=['waiting', 'in_progress'])
                    ),
                    Value(0),
                    output_field=IntegerField()
                )
            )

            if not hospitals_queryset.exists():
                return Response({'error': 'No hospitals available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # Prepare hospital data with distances and travel times
            hospital_data = []
            for hospital in hospitals_queryset:
                distance = self.calculate_distance(
                    latitude, longitude,
                    float(hospital.latitude), float(hospital.longitude)
                )
                travel_time = self.calculate_travel_time(distance)
                
                hospital_data.append({
                    'id': hospital.id,
                    'name': hospital.hospital_name,
                    'address': hospital.address,
                    'phone': hospital.phone_number,
                    'latitude': float(hospital.latitude),
                    'longitude': float(hospital.longitude),
                    'current_wait_time': hospital.current_wait_time,
                    'distance_km': round(distance, 2),
                    'travel_time_minutes': travel_time,
                    'total_time': travel_time + hospital.current_wait_time
                })

            # Prepare AI context
            medical_context = ""
            if medical_profile:
                medical_context = f"""
PATIENT MEDICAL PROFILE:
- Name: {user.username}
- Date of Birth: {medical_profile.date_of_birth or 'Not provided'}
- Allergies: {medical_profile.allergies or 'None listed'}
- Pre-existing Conditions: {medical_profile.pre_existing_conditions or 'None listed'}
- Emergency Notes: {medical_profile.emergency_notes or 'None listed'}
- Current Location: {latitude}, {longitude}
                """

            hospital_context = "\n".join([
                f"Hospital {h['id']}: {h['name']} - Wait: {h['current_wait_time']}min, Travel: {h['travel_time_minutes']}min, Total: {h['total_time']}min, Distance: {h['distance_km']}km"
                for h in hospital_data
            ])

            # AI Prompt for emergency dispatch
            ai_prompt = f"""
You are an emergency dispatch AI system. Analyze the patient information and available hospitals to make the BEST emergency dispatch decision.

{medical_context}

AVAILABLE HOSPITALS:
{hospital_context}

CRITICAL FACTORS TO CONSIDER:
1. EMERGENCY SEVERITY: This is a medical emergency - time is critical
2. For life-threatening emergencies, prioritize travel time over wait time
3. Consider patient's medical history and allergies
4. Factor in hospital specialties if relevant to conditions
5. Balance total time (travel + wait) for non-critical emergencies

Return a JSON response with:
{{
    "recommended_hospital_id": [hospital_id],
    "reasoning": "Brief explanation of why this hospital was chosen (max 100 words)",
    "tts_script_for_911": "Complete script for 911 operator including: 'Emergency alert for [patient name] at coordinates [lat, long]. Patient has [relevant medical conditions]. Recommended hospital: [hospital name] at [address], phone [phone]. [Any critical medical notes].'"
}}

Respond ONLY with valid JSON.
            """

            # Call Gemini AI
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                # Fallback to closest hospital
                closest_hospital = min(hospital_data, key=lambda x: x['total_time'])
                recommended_hospital = hospitals_queryset.get(id=closest_hospital['id'])
                
                return Response({
                    'recommended_hospital': HospitalMapSerializer(recommended_hospital).data,
                    'reasoning': f"Selected {recommended_hospital.hospital_name} as the closest available hospital with shortest total response time.",
                    'tts_script_for_911': f"Emergency alert for {user.username} at coordinates {latitude}, {longitude}. Recommended hospital: {recommended_hospital.hospital_name} at {recommended_hospital.address}, phone {recommended_hospital.phone_number}."
                })

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            response = model.generate_content(ai_prompt)
            
            try:
                # Parse AI response
                response_text = response.text.strip()
                if '```' in response_text:
                    response_text = response_text.split('```')[1]
                    if response_text.startswith('json'):
                        response_text = response_text[4:]
                
                ai_data = json.loads(response_text)
                
                recommended_hospital_id = ai_data.get('recommended_hospital_id')
                recommended_hospital = hospitals_queryset.get(id=recommended_hospital_id)
                
                return Response({
                    'recommended_hospital': HospitalMapSerializer(recommended_hospital).data,
                    'reasoning': ai_data.get('reasoning', 'AI recommendation'),
                    'tts_script_for_911': ai_data.get('tts_script_for_911', 'Emergency dispatch script')
                })
                
            except (json.JSONDecodeError, KeyError, HospitalProfile.DoesNotExist) as e:
                print(f"AI parsing error in emergency dispatch: {e}")
                # Fallback to closest hospital
                closest_hospital = min(hospital_data, key=lambda x: x['total_time'])
                recommended_hospital = hospitals_queryset.get(id=closest_hospital['id'])
                
                return Response({
                    'recommended_hospital': HospitalMapSerializer(recommended_hospital).data,
                    'reasoning': f"Selected {recommended_hospital.hospital_name} based on optimal response time.",
                    'tts_script_for_911': f"Emergency alert for {user.username} at coordinates {latitude}, {longitude}. Recommended hospital: {recommended_hospital.hospital_name} at {recommended_hospital.address}, phone {recommended_hospital.phone_number}."
                })

        except Exception as e:
            print(f"Emergency dispatch error: {e}")
            return Response({'error': 'Emergency dispatch system unavailable'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RequestAdmissionView(APIView):
    """Patient request for hospital admission with AI recommendation"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsPatient]

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c

    def calculate_travel_time(self, distance_km):
        """Calculate travel time assuming normal driving speed"""
        average_speed_kmh = 40
        return math.ceil((distance_km / average_speed_kmh) * 60)  # Convert to minutes

    def post(self, request):
        try:
            user = request.user
            
            # Rate limiting: check if user has made a request today
            today = timezone.now().date()
            existing_request = HospitalRequest.objects.filter(
                patient=user,
                created_at__date=today
            ).first()
            
            if existing_request:
                return Response({
                    'error': 'You can only make one hospital request per day',
                    'existing_request': HospitalRequestSerializer(existing_request).data
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            serializer = AdmissionRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            reason_for_visit = serializer.validated_data['reason_for_visit']
            latitude = float(serializer.validated_data['latitude'])
            longitude = float(serializer.validated_data['longitude'])

            # Get patient's medical profile
            try:
                medical_profile = user.medical_profile
            except MedicalProfile.DoesNotExist:
                medical_profile = None

            # Get all verified hospitals
            hospitals_queryset = HospitalProfile.objects.filter(
                user__is_verified=True,
                latitude__isnull=False,
                longitude__isnull=False
            ).annotate(
                current_wait_time=Coalesce(
                    Sum(
                        'patient_queue__estimated_service_time',
                        filter=Q(patient_queue__status__in=['waiting', 'in_progress'])
                    ),
                    Value(0),
                    output_field=IntegerField()
                )
            )

            if not hospitals_queryset.exists():
                return Response({'error': 'No hospitals available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            # Prepare hospital data with distances
            hospital_data = []
            for hospital in hospitals_queryset:
                distance = self.calculate_distance(
                    latitude, longitude,
                    float(hospital.latitude), float(hospital.longitude)
                )
                travel_time = self.calculate_travel_time(distance)
                
                hospital_data.append({
                    'id': hospital.id,
                    'name': hospital.hospital_name,
                    'address': hospital.address,
                    'current_wait_time': hospital.current_wait_time,
                    'distance_km': round(distance, 2),
                    'travel_time_minutes': travel_time,
                    'total_time': travel_time + hospital.current_wait_time
                })

            # Prepare AI context
            medical_context = ""
            if medical_profile:
                medical_context = f"""
PATIENT MEDICAL PROFILE:
- Name: {user.username}
- Date of Birth: {medical_profile.date_of_birth or 'Not provided'}
- Allergies: {medical_profile.allergies or 'None listed'}
- Pre-existing Conditions: {medical_profile.pre_existing_conditions or 'None listed'}
                """

            hospital_context = "\n".join([
                f"Hospital {h['id']}: {h['name']} - Wait: {h['current_wait_time']}min, Travel: {h['travel_time_minutes']}min, Total: {h['total_time']}min"
                for h in hospital_data
            ])

            # AI Prompt for admission recommendation - IMPROVED VERSION
            ai_prompt = f"""
You are a medical triage AI. Analyze the patient's reason for visit and recommend the best hospital.

{medical_context}

REASON FOR VISIT: {reason_for_visit}

AVAILABLE HOSPITALS:
{hospital_context}

ASSESSMENT CRITERIA:
1. Assess urgency/severity of the reason for visit (1-10 scale)
2. For high urgency (7-10): prioritize travel time
3. For medium urgency (4-6): balance travel time and wait time  
4. For low urgency (1-3): prioritize shortest wait time
5. Consider patient's medical history if relevant

Return a JSON response with ONLY the hospital ID number (not the name). Example format:
{{
    "recommended_hospital_id": 2,
    "urgency_score": 5,
    "reasoning": "Brief explanation of hospital choice and urgency assessment (max 150 words)"
}}

IMPORTANT: The recommended_hospital_id must be ONLY the numeric ID (like 2), not the hospital name.

Respond ONLY with valid JSON.
            """

            # Call Gemini AI
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                
                try:
                    response = model.generate_content(ai_prompt)
                    response_text = response.text.strip()
                    
                    if '```' in response_text:
                        response_text = response_text.split('```')[1]
                        if response_text.startswith('json'):
                            response_text = response_text[4:]
                    
                    ai_data = json.loads(response_text)
                    recommended_hospital_id = ai_data.get('recommended_hospital_id')
                    ai_reasoning = ai_data.get('reasoning', 'AI recommendation based on symptoms and hospital availability')
                    
                    # IMPROVED AI PARSING - Handle various formats
                    print(f"Raw AI hospital ID: {recommended_hospital_id}")
                    
                    # Convert to proper integer ID
                    if isinstance(recommended_hospital_id, list):
                        recommended_hospital_id = recommended_hospital_id[0]
                    
                    if isinstance(recommended_hospital_id, str):
                        # Extract number from string like "Hospital 2" -> 2
                        import re
                        numbers = re.findall(r'\d+', str(recommended_hospital_id))
                        if numbers:
                            recommended_hospital_id = int(numbers[0])
                        else:
                            raise ValueError("No valid ID found in string")
                    
                    # Ensure it's an integer
                    recommended_hospital_id = int(recommended_hospital_id)
                    print(f"Processed hospital ID: {recommended_hospital_id}")
                    
                except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
                    print(f"AI parsing error in admission request: {e}")
                    # Fallback to closest hospital
                    closest_hospital = min(hospital_data, key=lambda x: x['total_time'])
                    recommended_hospital_id = closest_hospital['id']
                    ai_reasoning = f"Recommended {closest_hospital['name']} based on optimal total time (travel + wait)."
            else:
                # Fallback without AI
                closest_hospital = min(hospital_data, key=lambda x: x['total_time'])
                recommended_hospital_id = closest_hospital['id']
                ai_reasoning = f"Recommended {closest_hospital['name']} based on shortest total time."

            # Get the recommended hospital - SIMPLIFIED
            try:
                recommended_hospital = hospitals_queryset.get(id=recommended_hospital_id)
                print(f"✅ Successfully found hospital: {recommended_hospital.hospital_name}")
                
            except HospitalProfile.DoesNotExist:
                print(f"❌ Hospital with ID {recommended_hospital_id} not found, using fallback")
                # Fallback to the closest hospital
                closest_hospital = min(hospital_data, key=lambda x: x['total_time'])
                recommended_hospital = hospitals_queryset.get(id=closest_hospital['id'])
                ai_reasoning = f"Recommended {recommended_hospital.hospital_name} (fallback due to AI parsing error)."

            # Create the hospital request
# Create the hospital request
            hospital_request = HospitalRequest.objects.create(
                patient=user,
                reason_for_visit=reason_for_visit,
                patient_latitude=latitude,
                patient_longitude=longitude,
                recommended_hospital=recommended_hospital,
                ai_reasoning=ai_reasoning,
                urgency_score=ai_data.get('urgency_score', 5)  # ADD THIS LINE
            )

            print(f"✅ Created hospital request #{hospital_request.id}")

            # Return the recommendation
            return Response({
                'request_id': hospital_request.id,
                'recommended_hospital': HospitalMapSerializer(recommended_hospital).data,
                'reasoning': ai_reasoning,
                'status': 'pending'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"❌ Admission request error: {e}")
            import traceback
            traceback.print_exc()
            return Response({'error': 'Unable to process admission request'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HospitalRequestsListView(generics.ListAPIView):
    """View incoming patient requests for hospital"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsVerifiedHospital]
    serializer_class = HospitalRequestSerializer

    def get_queryset(self):
        hospital_profile = self.request.user.hospital_profile
        return HospitalRequest.objects.filter(
            recommended_hospital=hospital_profile,
            status='pending'
        ).select_related('patient')


class AcceptHospitalRequestView(APIView):
    """Accept a patient request and add them to queue"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsVerifiedHospital]

    def post(self, request, request_id):
        try:
            hospital_profile = request.user.hospital_profile
            
            hospital_request = HospitalRequest.objects.get(
                id=request_id,
                recommended_hospital=hospital_profile,
                status='pending'
            )
            
            patient = hospital_request.patient
            
            # Check if patient is already in queue
            if PatientQueue.objects.filter(hospital=hospital_profile, patient=patient).exists():
                return Response({'error': 'Patient already in queue'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Add patient to queue (reuse existing logic)
            priority = 5  # Default priority for non-emergency
            service_time = 30  # Default service time
            
            # Create queue entry
            queue_entry = PatientQueue.objects.create(
                hospital=hospital_profile,
                patient=patient,
                priority_score=priority,
                estimated_service_time=service_time,
                notes=f"Admitted via request: {hospital_request.reason_for_visit[:100]}"
            )
            
            # Update request status
            hospital_request.status = 'accepted'
            hospital_request.save()
            
            return Response({
                'message': 'Patient request accepted and added to queue',
                'queue_entry': PatientQueueSerializer(queue_entry).data
            })
            
        except HospitalRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Accept request error: {e}")
            return Response({'error': 'Unable to accept request'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RejectHospitalRequestView(APIView):
    """Reject a patient request"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsVerifiedHospital]

    def post(self, request, request_id):
        try:
            hospital_profile = request.user.hospital_profile
            
            hospital_request = HospitalRequest.objects.get(
                id=request_id,
                recommended_hospital=hospital_profile,
                status='pending'
            )
            
            hospital_request.status = 'rejected'
            hospital_request.save()
            
            return Response({'message': 'Patient request rejected'})
            
        except HospitalRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Reject request error: {e}")
            return Response({'error': 'Unable to reject request'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)