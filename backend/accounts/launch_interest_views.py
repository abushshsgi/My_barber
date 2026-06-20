from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.launch_interest_serializers import LaunchInterestSerializer


class LaunchInterestCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LaunchInterestSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        return Response(LaunchInterestSerializer(obj).data, status=status.HTTP_201_CREATED)
