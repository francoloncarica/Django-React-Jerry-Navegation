from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import MapSession, Session

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class MapSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapSession
        fields = '__all__'

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'
        read_only_fields = ['user']  # El campo user no se espera que lo envíe el cliente

    # Sobrescribe el método create para asignar el usuario desde la solicitud
    def create(self, validated_data):
        user = self.context['request'].user  # Se obtiene el usuario autenticado del contexto
        return Session.objects.create(user=user, **validated_data)
