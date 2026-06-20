from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.address_serializers import UserAddressSerializer
from accounts.address_sync import ensure_home_address_from_profile, set_default_address
from accounts.models import UserAddress


class UserAddressListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = UserAddress.objects.filter(user=request.user)
        if not qs.exists():
            ensure_home_address_from_profile(request.user)
            qs = UserAddress.objects.filter(user=request.user)
        data = UserAddressSerializer(qs, many=True, context={"request": request}).data
        return Response(data)

    def post(self, request):
        serializer = UserAddressSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        addr = serializer.save()
        return Response(
            UserAddressSerializer(addr, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class UserAddressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, request, pk: int) -> UserAddress:
        return get_object_or_404(UserAddress, pk=pk, user=request.user)

    def patch(self, request, pk: int):
        addr = self._get(request, pk)
        serializer = UserAddressSerializer(
            addr,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        addr = serializer.save()
        return Response(UserAddressSerializer(addr, context={"request": request}).data)

    def delete(self, request, pk: int):
        addr = self._get(request, pk)
        was_default = addr.is_default
        user = request.user
        addr.delete()
        if was_default:
            next_addr = UserAddress.objects.filter(user=user).order_by("-updated_at").first()
            if next_addr:
                set_default_address(user, next_addr)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserAddressSetDefaultView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        addr = get_object_or_404(UserAddress, pk=pk, user=request.user)
        set_default_address(request.user, addr)
        return Response(UserAddressSerializer(addr, context={"request": request}).data)
