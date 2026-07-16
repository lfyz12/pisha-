from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import FullyAuthenticated

from .models import Scholarship
from .serializers import ScholarshipSerializer


@api_view(["GET"])
@permission_classes([FullyAuthenticated])
def scholarship_list_view(request):
    scholarships = Scholarship.objects.all()
    serializer = ScholarshipSerializer(scholarships, many=True)
    return Response({"data": serializer.data, "status": 200})
