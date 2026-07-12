from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class AppPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "pageSize"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "data": data,
                "total": self.page.paginator.count,
                "page": self.page.number,
                "pageSize": self.page.paginator.per_page,
                "totalPages": self.page.paginator.num_pages,
            }
        )
