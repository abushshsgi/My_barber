from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.family_serializers import FamilyMemberSerializer
from accounts.models import FamilyMember


class FamilyMemberListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = FamilyMember.objects.filter(user=request.user)
        data = FamilyMemberSerializer(qs, many=True, context={"request": request}).data
        return Response(data)

    def post(self, request):
        serializer = FamilyMemberSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        return Response(
            FamilyMemberSerializer(member, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class FamilyMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, request, pk: int) -> FamilyMember:
        return get_object_or_404(FamilyMember, pk=pk, user=request.user)

    def patch(self, request, pk: int):
        member = self._get(request, pk)
        serializer = FamilyMemberSerializer(
            member,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        return Response(FamilyMemberSerializer(member, context={"request": request}).data)

    def delete(self, request, pk: int):
        member = self._get(request, pk)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
