"""Test suite for PrimeBankApp HTTP utilities."""

from http import HTTPStatus

from django.test import TestCase


class HealthCheckViewTests(TestCase):
    """Validate the readiness probe exposed by django-health-check."""

    def test_health_endpoint_reports_operational(self) -> None:
        """Ensure the aggregated health endpoint responds with HTTP 200."""
        response = self.client.get("/health/")

        assert response.status_code == HTTPStatus.OK  # noqa: S101
