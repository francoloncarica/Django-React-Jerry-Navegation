from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.contrib.postgres.fields import JSONField
from django.conf import settings


class CustomUser(AbstractUser):
    groups = models.ManyToManyField(
        Group,
        related_name="customuser_set",  # Cambiado a un nombre único
        blank=True,
        help_text="The groups this user belongs to. A user will get all permissions granted to each of his/her group.",
        verbose_name="groups",
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name="customuser_permissions_set",  # Cambiado a un nombre único
        blank=True,
        help_text="Specific permissions for this user.",
        verbose_name="user permissions",
    )

class MapSession(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)


class Session(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,  # Allow null values
        blank=True  # Allow blank values in forms
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    boats = models.JSONField(default=list)
    view_state = models.JSONField(default=dict)
    is_playing = models.BooleanField(default=False)
    play_speed = models.FloatField(default=1.0)
    twd = models.FloatField(default=0.0)
    trail_type = models.CharField(max_length=50, default="Complete")
    current_progress = models.FloatField(default=0.0)
    metric = models.CharField(max_length=50, default="sog")
    active_boat = models.IntegerField(null=True, blank=True)
    is_boat_panel_visible = models.BooleanField(default=True)
    video_url = models.URLField(null=True, blank=True)
    video_duration = models.FloatField(default=0.0)

    def __str__(self):
        return f"Session {self.id} - Created at {self.created_at}"