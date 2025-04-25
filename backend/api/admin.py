from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Session

# Register the CustomUser model with the UserAdmin interface
@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    pass

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at', 'updated_at', 'boats_display', 'view_state_display')
    search_fields = ('id', 'user__username')  # Allow searching by user username
    readonly_fields = ('created_at', 'updated_at')

    def boats_display(self, obj):
        # Display a readable version of the boats field
        return obj.boats if len(str(obj.boats)) <= 100 else str(obj.boats)[:100] + "..."
    boats_display.short_description = "Boats"

    def view_state_display(self, obj):
        # Display a readable version of the view_state field
        return obj.view_state if len(str(obj.view_state)) <= 100 else str(obj.view_state)[:100] + "..."
    view_state_display.short_description = "View State"