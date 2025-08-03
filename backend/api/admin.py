# api/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import CustomUser, MedicalProfile, HospitalProfile, PatientQueue, HospitalRequest

# --- Custom Admin Actions ---
@admin.action(description='Mark selected accounts as verified')
def make_verified(modeladmin, request, queryset):
    queryset.update(is_verified=True)

@admin.action(description='Mark selected accounts as unverified')
def make_unverified(modeladmin, request, queryset):
    queryset.update(is_verified=False)

# --- Custom Admin Classes ---
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'user_type', 'verification_status', 'is_staff', 'date_joined')
    list_filter = ('user_type', 'is_verified', 'is_staff', 'is_superuser', 'groups', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    actions = [make_verified, make_unverified]
    
    def verification_status(self, obj):
        if obj.is_verified:
            return format_html('<span style="color: green;">✅ Verified</span>')
        else:
            return format_html('<span style="color: red;">❌ Pending</span>')
    verification_status.short_description = 'Verification'
    
    fieldsets = UserAdmin.fieldsets + (
        ('VitalLink Settings', {'fields': ('user_type', 'is_verified')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('VitalLink Settings', {'fields': ('user_type', 'is_verified')}),
    )

class MedicalProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'date_of_birth', 'has_allergies', 'has_conditions', 'profile_complete')
    list_filter = ('date_of_birth',)
    search_fields = ('user__username', 'user__email', 'allergies', 'pre_existing_conditions')
    readonly_fields = ('user',)
    
    def has_allergies(self, obj):
        return bool(obj.allergies)
    has_allergies.boolean = True
    has_allergies.short_description = 'Has Allergies'
    
    def has_conditions(self, obj):
        return bool(obj.pre_existing_conditions)
    has_conditions.boolean = True
    has_conditions.short_description = 'Has Conditions'
    
    def profile_complete(self, obj):
        return bool(obj.date_of_birth and obj.address)
    profile_complete.boolean = True
    profile_complete.short_description = 'Profile Complete'

class HospitalProfileAdmin(admin.ModelAdmin):
    list_display = ('hospital_name', 'user', 'has_coordinates', 'phone_number', 'verification_status')
    list_filter = ('user__is_verified',)
    search_fields = ('hospital_name', 'address', 'phone_number', 'user__username')
    readonly_fields = ('user',)
    
    def has_coordinates(self, obj):
        return bool(obj.latitude and obj.longitude)
    has_coordinates.boolean = True
    has_coordinates.short_description = 'Has Location'
    
    def verification_status(self, obj):
        if obj.user.is_verified:
            return format_html('<span style="color: green;">✅ Verified</span>')
        else:
            return format_html('<span style="color: red;">❌ Pending</span>')
    verification_status.short_description = 'Status'

class PatientQueueAdmin(admin.ModelAdmin):
    list_display = ('patient', 'hospital', 'status', 'priority_score', 'estimated_service_time', 'admitted_at')
    list_filter = ('status', 'priority_score', 'admitted_at', 'hospital')
    search_fields = ('patient__username', 'hospital__hospital_name', 'notes')
    date_hierarchy = 'admitted_at'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('patient', 'hospital')

class HospitalRequestAdmin(admin.ModelAdmin):
    list_display = ('patient', 'recommended_hospital', 'status', 'urgency_indicator', 'created_at')
    list_filter = ('status', 'created_at', 'recommended_hospital')
    search_fields = ('patient__username', 'reason_for_visit', 'recommended_hospital__hospital_name')
    readonly_fields = ('patient', 'recommended_hospital', 'patient_latitude', 'patient_longitude', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    
    def urgency_indicator(self, obj):
        reasoning = obj.ai_reasoning.lower()
        if 'urgent' in reasoning or 'critical' in reasoning:
            return format_html('<span style="color: red;">🔴 Urgent</span>')
        elif 'moderate' in reasoning:
            return format_html('<span style="color: orange;">🟡 Moderate</span>')
        else:
            return format_html('<span style="color: green;">🟢 Routine</span>')
    urgency_indicator.short_description = 'Urgency'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('patient', 'recommended_hospital')

# Register models
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(MedicalProfile, MedicalProfileAdmin)
admin.site.register(HospitalProfile, HospitalProfileAdmin)
admin.site.register(PatientQueue, PatientQueueAdmin)
admin.site.register(HospitalRequest, HospitalRequestAdmin)

# Customize admin site header
admin.site.site_header = "VitalLink Administration"
admin.site.site_title = "VitalLink Admin"
admin.site.index_title = "Welcome to VitalLink Administration"