from django.views.decorators.cache import cache_page  # Add this import
from django.utils.decorators import method_decorator
from .functions.gpx_utils import parse_gpx
from django.contrib.auth import get_user_model, authenticate, login, logout
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.middleware.csrf import get_token
from django.http import JsonResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Session  # Asegúrate que Session está correctamente importado
from .serializers import SessionSerializer
from rest_framework.decorators import api_view
from shapely.geometry import LineString  # Add this import
User = get_user_model()  # Obtiene el modelo de usuario personalizado

class RegisterView(APIView):
    def post(self, request):
        print("CSRF Token (Header):", request.META.get('HTTP_X_CSRFTOKEN'))
        print("CSRF Token (Cookie):", request.COOKIES.get('csrftoken'))
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(username=username, email=email, password=password)
        return Response({'message': 'User registered successfully'}, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)  # Log the user in
            refresh = RefreshToken.for_user(user)
            response = Response({
                'success': True,
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'username': user.username,
                'email': user.email,
                'id': user.id
            }, status=status.HTTP_200_OK)
            
            # Set session cookie
            response.set_cookie(
                'sessionid',
                request.session.session_key,
                httponly=True,
                samesite='Lax'
            )
            
            return response
            
        return Response({
            'success': False,
            'error': 'Invalid credentials'
        }, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)

@api_view(['POST'])
def logout_view(request):
    try:
        # Clear session
        request.session.flush()
        # Clear auth
        logout(request)
        # Clear any custom session data
        request.session.clear()
        
        response = Response({'success': True})
        # Clear session cookie
        response.delete_cookie('sessionid')
        response.delete_cookie('csrftoken')
        
        return response
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

class CreateSessionView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        data = request.data.copy()  # Copia de los datos recibidos
        # Pasa el objeto request en el contexto, de modo que en create() se asigne el usuario
        serializer = SessionSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()  # Invoca el método create que asigna user correctamente
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GetSessionView(APIView):
    def get(self, request, id):
        try:
            session = Session.objects.get(id=id)
            serializer = SessionSerializer(session)
            return Response(serializer.data)
        except Session.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

class UpdateSessionView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def put(self, request, id):
        try:
            # Depuración: muestra el usuario haciendo la petición
            print("User making update:", request.user)
            session = Session.objects.get(id=id, user=request.user)
            print("Found session:", session)
            serializer = SessionSerializer(session, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Session.DoesNotExist:
            print("Session not found for user:", request.user, "with id:", id)
            return Response({"error": "Session not found or you don't have permission"}, status=status.HTTP_404_NOT_FOUND)

class ListSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = Session.objects.filter(user=request.user)
        serializer = SessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class DeleteSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, id):
        try:
            session = Session.objects.get(id=id, user=request.user)
            session.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Session.DoesNotExist:
            return Response({"error": "Session not found or you don't have permission"}, status=status.HTTP_404_NOT_FOUND)

class UserInfoView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        return Response({
            'username': request.user.username,
            'email': request.user.email,
            'id': request.user.id
        })

def csrf_token_view(request):
    return JsonResponse({'csrfToken': get_token(request)})

from .functions.gpx_utils import parse_gpx  # Debe devolver lista de TrackPoint {lat, lon, time…}
from shapely.geometry import LineString  # Add this import
import xml.etree.ElementTree as ET

# views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

from .functions.gpx_utils import parse_gpx
from shapely.geometry import LineString
import xml.etree.ElementTree as ET

# views.py (fragmento relevante)

class GPXProcessView(APIView):
    @method_decorator(cache_page(60 * 60), name='dispatch')
    def post(self, request):
        gpx_file = request.FILES.get('file')
        if not gpx_file:
            return Response({"error": "No se proporcionó ningún archivo"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            tolerance = float(request.query_params.get('tolerance', 0.0001))
        except ValueError:
            tolerance = 0.0001

        content = gpx_file.read().decode('utf-8')
        raw_points = parse_gpx(content)
        if not raw_points:
            return Response({"error": "No se encontraron puntos"}, status=status.HTTP_400_BAD_REQUEST)

        # Debug: mostrar algunos puntos en consola
        print("First 5 parsed points:", raw_points[:5])

        # Construir y simplificar línea
        coords = [(pt['lon'], pt['lat']) for pt in raw_points]
        line = LineString(coords)
        simplified = line.simplify(tolerance, preserve_topology=False)
        simp_coords = list(simplified.coords)

        feature_collection = {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": simp_coords
                },
                "properties": {
                    "original_point_count": len(coords),
                    "simplified_point_count": len(simp_coords),
                    "tolerance": tolerance
                }
            }]
        }

        # Devolver raw_points para debug + geojson para render
        return Response({
            "raw_points": raw_points,
            "geojson": feature_collection,
            "original_count": len(coords),
            "simplified_count": len(simp_coords)
        }, status=status.HTTP_200_OK)
