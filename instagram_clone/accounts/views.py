from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import ViewSet
from django.contrib.auth.models import User
from rest_framework import generics, filters
from django.contrib.auth.models import User
from accounts.serializers import UserSerializer


from .models import Follow
from .serializers import UserSerializer

class UserSearchView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email']


class UserFollowViewSet(ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    # 🔁 FOLLOW / UNFOLLOW
    @action(detail=True, methods=['post'])
    def follow(self, request, pk=None):
        target_user = self.get_user(pk)

        if not target_user:
            return Response({"detail": "User not found"}, status=404)

        if target_user == request.user:
            return Response(
                {"detail": "You cannot follow yourself"},
                status=status.HTTP_400_BAD_REQUEST
            )

        follow_obj, created = Follow.objects.get_or_create(
            follower=request.user,
            following=target_user
        )

        if not created:
            follow_obj.delete()
            return Response({
                "following": False,
                "message": "Unfollowed successfully"
            })

        return Response({
            "following": True,
            "message": "Followed successfully"
        }, status=status.HTTP_201_CREATED)

    # 👥 FOLLOWERS LIST
    @action(detail=True, methods=['get'])
    def followers(self, request, pk=None):
        user = self.get_user(pk)
        followers = User.objects.filter(following__following=user)
        serializer = UserSerializer(followers, many=True)
        return Response(serializer.data)

    # 👥 FOLLOWING LIST
    @action(detail=True, methods=['get'])
    def following(self, request, pk=None):
        user = self.get_user(pk)
        following = User.objects.filter(followers__follower=user)
        serializer = UserSerializer(following, many=True)
        return Response(serializer.data)
