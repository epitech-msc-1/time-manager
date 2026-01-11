# PrimeBankApp/views_timeclock_export.py

import csv
import json
import base64
from datetime import datetime, timedelta, date

from django.http import StreamingHttpResponse, HttpResponseForbidden, HttpResponseBadRequest
from django.core.signing import TimestampSigner, BadSignature
from django.conf import settings

from graphql_jwt.utils import get_payload
from graphql_jwt.shortcuts import get_user_by_payload

from PrimeBankApp.roles import is_manager_of
from .models import CustomUser, TimeClock


class Echo:
    def write(self, v):
        return v


def _authenticate_request_with_jwt(request):
    """
    Essaie d'authentifier la requête via:
      - Header: Authorization: JWT <token>  ou  Bearer <token>
      - Cookie: JWT=<token> (si jwt_cookie configuré)
    Retourne un user ou None.
    """
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    token = None

    if auth.startswith("JWT ") or auth.startswith("Bearer "):
        token = auth.split(" ", 1)[1].strip()

    if not token:
        cookie_name = getattr(settings, "GRAPHQL_JWT", {}).get("JWT_COOKIE_NAME", "JWT")
        token = request.COOKIES.get(cookie_name)

    if not token:
        return None

    try:
        payload = get_payload(token, context=None)
        user = get_user_by_payload(payload)
        return user
    except Exception:
        return None


def _duration_seconds(day, cin, cout):
    if not cin or not cout:
        return 0.0
    sd = datetime.combine(day, cin)
    ed = datetime.combine(day, cout)
    if ed < sd:  # overnight
        ed += timedelta(days=1)
    return (ed - sd).total_seconds()


def export_timeclock_csv(request, token: str):
    """
    GET /api/export/timeclock/csv/<token>/
    - auth: session OU JWT (Authorization header ou cookie)
    - token signé (15 min)
    - contrôle: self OU manager
    - réponse: CSV en streaming
    """
    # 1) Auth
    if not request.user.is_authenticated:
        user = _authenticate_request_with_jwt(request)
        if user is None:
            return HttpResponseForbidden("Auth required")
        request.user = user

    # 2) Décodage token signé
    signer = TimestampSigner()
    try:
        unsigned_b64 = signer.unsign(token, max_age=900)  # 15 minutes
        raw_json = base64.urlsafe_b64decode(unsigned_b64).decode()
        data = json.loads(raw_json)
    except BadSignature:
        return HttpResponseBadRequest("Invalid or expired token")
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
        return HttpResponseBadRequest("Invalid token payload")

    requester_id = data.get("requester_id")
    target_user_id = data.get("target_user_id")
    start_s = data.get("start_date")
    end_s = data.get("end_date")
    sep = data.get("sep", ";")

    # 3) Le caller doit être celui inscrit dans le token
    if str(request.user.id) != str(requester_id):
        return HttpResponseForbidden("Unauthorized")

    # 4) Cible + droits (self OU manager OU admin)
    try:
        target = CustomUser.objects.get(pk=target_user_id)
    except CustomUser.DoesNotExist:
        return HttpResponseBadRequest("Target user not found")

    is_self = str(request.user.id) == str(target_user_id)
    is_admin = getattr(request.user, "is_admin", False) or request.user.is_superuser

    if not (is_self or is_admin or is_manager_of(request.user, getattr(target, "team_id", None))):
        return HttpResponseForbidden("Not allowed")

    # 5) Dates
    try:
        s = date.fromisoformat(start_s)
        e = date.fromisoformat(end_s)
    except Exception:
        return HttpResponseBadRequest("Bad date format (YYYY-MM-DD)")
    if s > e:
        return HttpResponseBadRequest("start_date must be <= end_date")

    # 6) Données
    qs = (
        TimeClock.objects
        .filter(user_id=target_user_id, day__range=(s, e))
        .order_by("day", "clock_in")
    )

    # 7) Streaming CSV
    buf = Echo()
    w = csv.writer(buf, delimiter=sep)

    def rows():
        yield w.writerow(["id", "user_id", "day", "clock_in", "clock_out", "total_seconds", "total_hours"])
        total = 0.0
        for tc in qs.iterator():
            secs = _duration_seconds(tc.day, tc.clock_in, tc.clock_out)
            total += secs
            yield w.writerow([
                tc.id,
                tc.user_id,
                tc.day.isoformat(),
                tc.clock_in.strftime("%H:%M:%S") if tc.clock_in else "",
                tc.clock_out.strftime("%H:%M:%S") if tc.clock_out else "",
                int(round(secs)),
                f"{secs/3600:.2f}",
            ])
        yield w.writerow([])
        yield w.writerow(["TOTAL", "", "", "", "", int(round(total)), f"{total/3600:.2f}"])

    resp = StreamingHttpResponse(rows(), content_type="text/csv")
    fname = f'timeclocks_{target_user_id}_{s.strftime("%Y%m%d")}_{e.strftime("%Y%m%d")}.csv'
    resp["Content-Disposition"] = f'attachment; filename="{fname}"'
    return resp
