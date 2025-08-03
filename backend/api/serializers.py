# api/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import MedicalProfile, HospitalProfile, CustomUser, PatientQueue,HospitalRequest
User = get_user_model()

# Basic serializers
class MedicalProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalProfile
        fields = ['date_of_birth', 'address', 'allergies', 'pre_existing_conditions', 'emergency_notes']

class HospitalProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalProfile
        fields = ['hospital_name', 'address', 'phone_number']

# Patient info for queue display
class PatientInfoSerializer(serializers.ModelSerializer):
    medical_profile = MedicalProfileSerializer(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'medical_profile']

# Patient queue serializer
class PatientQueueSerializer(serializers.ModelSerializer):
    patient = PatientInfoSerializer(read_only=True)
    hospital_name = serializers.CharField(source='hospital.hospital_name', read_only=True)
    
    class Meta:
        model = PatientQueue
        fields = [
            'id', 'patient', 'hospital_name', 'admitted_at', 'updated_at',
            'priority_score', 'estimated_service_time', 'status', 'notes'
        ]
        read_only_fields = ['id', 'admitted_at', 'updated_at']

# User serializer with nested profiles
class UserSerializer(serializers.ModelSerializer):
    # Use 'profile' for frontend compatibility (maps to medical_profile)
    profile = MedicalProfileSerializer(source='medical_profile', read_only=True)
    hospital_profile = HospitalProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'user_type', 'is_verified', 'profile', 'hospital_profile']

# User update serializer
class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['username', 'email']

    def validate_username(self, value):
        user = self.instance
        if CustomUser.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        user = self.instance
        if value and CustomUser.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

# Registration serializer
class RegisterSerializer(serializers.ModelSerializer):
    # Common fields
    user_type = serializers.ChoiceField(choices=CustomUser.USER_TYPE_CHOICES)
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    # Patient-specific fields
    date_of_birth = serializers.DateField(write_only=True, required=False, allow_null=True)

    # Hospital-specific fields
    hospital_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'username', 'password', 'email', 'user_type',
            'date_of_birth', 'hospital_name', 'address', 'phone_number'
        )

    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if value and CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, data):
        user_type = data.get('user_type')
        
        if user_type == 'patient':
            if not data.get('date_of_birth'):
                raise serializers.ValidationError({
                    'date_of_birth': 'Date of birth is required for patient accounts.'
                })
        elif user_type == 'hospital':
            required_fields = ['hospital_name', 'address', 'phone_number']
            for field in required_fields:
                if not data.get(field):
                    raise serializers.ValidationError({
                        field: f'This field is required for hospital accounts.'
                    })
        
        return data

    def create(self, validated_data):
        user_type = validated_data.pop('user_type')

        # Extract profile-related data
        date_of_birth = validated_data.pop('date_of_birth', None)
        hospital_name = validated_data.pop('hospital_name', None)
        address = validated_data.pop('address', None)
        phone_number = validated_data.pop('phone_number', None)

        # Create user with appropriate verification status
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', ''),
            user_type=user_type,
            is_verified=True if user_type == 'patient' else False
        )

        # UPDATE profiles (signal already created them)
        if user_type == 'patient':
            # Update the profile created by the signal
            user.medical_profile.date_of_birth = date_of_birth
            user.medical_profile.save()
        elif user_type == 'hospital':
            # Create hospital profile (no signal for this)
            HospitalProfile.objects.create(
                user=user,
                hospital_name=hospital_name,
                address=address,
                phone_number=phone_number
            )

        return user
class HospitalMapSerializer(serializers.ModelSerializer):
    """
    Serializer for the public hospital map view. Includes the calculated wait time.
    """
    # This field will be populated by the database query annotation in the view.
    current_wait_time = serializers.IntegerField(read_only=True)

    class Meta:
        model = HospitalProfile
        fields = [
            'id', 'hospital_name', 'address', 'phone_number', 
            'latitude', 'longitude', 'current_wait_time'
        ]

# Add these to your existing api/serializers.py file

# Hospital Request serializers
class HospitalRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.username', read_only=True)
    hospital_name = serializers.CharField(source='recommended_hospital.hospital_name', read_only=True)
    
    class Meta:
        model = HospitalRequest
        fields = [
            'id', 'patient_name', 'reason_for_visit', 'patient_latitude', 
            'patient_longitude', 'hospital_name', 'ai_reasoning', 'status', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'patient_name', 'hospital_name']

# Emergency dispatch response serializer
class EmergencyDispatchSerializer(serializers.Serializer):
    recommended_hospital = HospitalMapSerializer(read_only=True)
    reasoning = serializers.CharField()
    tts_script_for_911 = serializers.CharField()

# Admission request serializer
class AdmissionRequestSerializer(serializers.Serializer):
    reason_for_visit = serializers.CharField(max_length=1000, help_text="Describe your symptoms or reason for visit")
    latitude = serializers.DecimalField(max_digits=20, decimal_places=15)  # More generous
    longitude = serializers.DecimalField(max_digits=20, decimal_places=15) # More generous