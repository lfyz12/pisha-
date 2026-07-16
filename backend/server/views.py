import random

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import FullyAuthenticated


@api_view(["GET"])
@permission_classes([FullyAuthenticated])
def server_metrics_view(request):
    data = {
        "cpuLoad": round(random.uniform(20, 60), 1),
        "ramUsage": round(random.uniform(30, 70), 1),
        "gpuUsage": round(random.uniform(10, 40), 1),
        "status": "online",
        "location": "Yekaterinburg",
    }
    return Response({"data": data, "status": 200})
