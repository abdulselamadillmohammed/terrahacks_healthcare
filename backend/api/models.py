# api/models.py
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver

class CustomUser(AbstractUser):
    USER_TYPE_CHOICES = (
        ('patient', 'Patient'),
        ('hospital', 'Hospital'),
    )
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='patient')
    is_verified = models.BooleanField(default=False, help_text='Set to true when a hospital account is verified by an admin.')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    email = models.EmailField(unique=True, blank=True, null=True)

    class Meta: 
        indexes = [
            models.Index(fields=["username"], name="username_index")
        ]
    
    def __str__(self):
        return self.username

class MedicalProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='medical_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True, help_text="Street address for emergency services")
    allergies = models.TextField(blank=True)
    pre_existing_conditions = models.TextField(blank=True, help_text="List any chronic illnesses or important conditions.")
    emergency_notes = models.TextField(blank=True, help_text="Any extra info for first responders (e.g., 'At risk of stroke, heart problems').")

    def __str__(self):
        return f"{self.user.username}'s Medical Profile"

class HospitalProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='hospital_profile')
    hospital_name = models.CharField(max_length=255)
    address = models.TextField()
    phone_number = models.CharField(max_length=20, blank=True)

    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)


    def __str__(self):
        return self.hospital_name

class PatientQueue(models.Model):
    """Model to track patients in hospital queues with AI-powered triage"""
    hospital = models.ForeignKey(HospitalProfile, on_delete=models.CASCADE, related_name='patient_queue')
    patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='queue_entries', limit_choices_to={'user_type': 'patient'})
    admitted_at = models.DateTimeField(auto_now_add=True)
    
    # AI-powered triage scores
    priority_score = models.IntegerField(default=1, help_text="Priority from 1 (lowest) to 10 (highest urgency)")
    estimated_service_time = models.IntegerField(default=30, help_text="Estimated time in minutes for service")
    
    # Status tracking
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='waiting')
    
    # Additional metadata
    notes = models.TextField(blank=True, help_text="Additional notes from hospital staff")
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority_score', 'admitted_at']  # Highest priority first, then FIFO
        unique_together = ['hospital', 'patient']  # Prevent duplicate entries
    
    def __str__(self):
        return f"{self.patient.username} at {self.hospital.hospital_name} (Priority: {self.priority_score})"

# Signal handlers
@receiver(post_save, sender=CustomUser)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        if instance.user_type == 'patient':
            MedicalProfile.objects.create(user=instance)

# Add this to your existing api/models.py file

class HospitalRequest(models.Model):
    """Model to track patient requests for hospital admission"""
    patient = models.ForeignKey(
        CustomUser, 
        on_delete=models.CASCADE, 
        related_name='hospital_requests',
        limit_choices_to={'user_type': 'patient'}
    )
    reason_for_visit = models.TextField(help_text="Patient's description of their symptoms/condition")
    # patient_latitude = models.DecimalField(max_digits=9, decimal_places=6, help_text="Patient's location when request was made")
    # patient_longitude = models.DecimalField(max_digits=10, decimal_places=6, help_text="Patient's location when request was made")
    
    patient_latitude = models.DecimalField(max_digits=20, decimal_places=15, help_text="Patient's location when request was made")
    patient_longitude = models.DecimalField(max_digits=20, decimal_places=15, help_text="Patient's location when request was made")

    # AI recommendation data
    recommended_hospital = models.ForeignKey(
        HospitalProfile, 
        on_delete=models.CASCADE, 
        related_name='incoming_requests',
        help_text="Hospital recommended by AI"
    )
    ai_reasoning = models.TextField(help_text="AI's explanation for hospital choice")
    
    # Request status
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='pending')
    urgency_score = models.IntegerField(default=5, help_text="AI-assessed urgency (1-10)")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Rate limiting: prevent multiple requests per day
    class Meta:
        ordering = ['-created_at']
        # Uncomment this if you want to enforce one request per patient per day
        # unique_together = [['patient', 'created_at__date']]
    
    def __str__(self):
        return f"{self.patient.username} request to {self.recommended_hospital.hospital_name} - {self.status}"

# Don't forget to run: python manage.py makemigrations && python manage.py migrate