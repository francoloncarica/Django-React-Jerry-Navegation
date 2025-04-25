from django.urls import path
from .views import (
    RegisterView, LoginView, csrf_token_view, 
    CreateSessionView, GetSessionView, UpdateSessionView, 
    ListSessionsView, LogoutView, DeleteSessionView,
    UserInfoView
)
from rest_framework_simplejwt.views import TokenRefreshView
from .views import GPXProcessView  # Asegúrate de importar tu vista


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('csrf-token/', csrf_token_view, name='csrf-token'),
    path('user-info/', UserInfoView.as_view(), name='user-info'),
    # Fix session URLs to avoid conflicts
    path('sessions/', ListSessionsView.as_view(), name='list-sessions'),
    path('sessions/create/', CreateSessionView.as_view(), name='create-session'),
    path('sessions/<int:id>/update/', UpdateSessionView.as_view(), name='update-session'),
    path('sessions/<int:id>/delete/', DeleteSessionView.as_view(), name='delete-session'),
    path('sessions/<int:id>/', GetSessionView.as_view(), name='get-session'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('gpx-process/', GPXProcessView.as_view(), name='gpx-process'),

]