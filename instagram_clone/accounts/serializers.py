from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Follow


# ---------- USER SERIALIZER ----------
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


# ---------- PROFILE SERIALIZER ----------
class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'id',
            'user',
            'bio',
            'avatar',
            'followers_count',
            'following_count',
            'is_following',
        ]

    # 🔢 Followers count
    def get_followers_count(self, obj):
        return Follow.objects.filter(following=obj.user).count()

    # 🔢 Following count
    def get_following_count(self, obj):
        return Follow.objects.filter(follower=obj.user).count()

    # 🔁 Is current user following this profile?
    def get_is_following(self, obj):
        request = self.context.get('request')

        if not request or not request.user.is_authenticated:
            return False

        return Follow.objects.filter(
            follower=request.user,
            following=obj.user
        ).exists()


# ---------- REGISTER SERIALIZER ----------
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )

        # 🔥 Auto-create profile safely
        Profile.objects.get_or_create(user=user)

        return user
