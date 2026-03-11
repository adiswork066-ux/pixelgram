from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserFollowViewSet
from .views import UserSearchView


router = DefaultRouter()
router.register(r'users', UserFollowViewSet, basename='users')

urlpatterns = [
    path('', include(router.urls)),
    path('search/', UserSearchView.as_view(), name='user-search'),

]
