# api/permissions.py

from rest_framework import permissions

class IsVerifiedHospital(permissions.BasePermission):
    """
    Allows access only to verified hospital users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.user_type == 'hospital' and
            request.user.is_verified
        )

class IsPatient(permissions.BasePermission):
    """
    Allows access only to patient users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.user_type == 'patient'
        )