"""URL configuration for PrimeBank project."""

from django.contrib import admin
from django.urls import include, path
from django.views.decorators.csrf import csrf_exempt
from graphene_django.views import GraphQLView
from graphql_jwt.decorators import jwt_cookie
from PrimeBankApp.views_timeclock_export import export_timeclock_csv
from PrimeBankApp.views_timeclock_pdf_export import export_timeclock_pdf

urlpatterns = [
    path("admin/", admin.site.urls),
    path("ht/", include("health_check.urls")),
    path(
        "graphql",
        jwt_cookie(csrf_exempt(GraphQLView.as_view(graphiql=True))),
    ),
    path("api/export/timeclock/csv/<str:token>/", export_timeclock_csv, name="export_timeclock_csv"),
    path("api/export/timeclock/pdf/<str:token>/", export_timeclock_pdf, name="export_timeclock_pdf"),
]


