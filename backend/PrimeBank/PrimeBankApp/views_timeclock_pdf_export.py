# PrimeBankApp/views_timeclock_pdf_export.py
import base64
import json
import os
from datetime import datetime, timedelta, date
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseBadRequest
from django.core.signing import TimestampSigner, BadSignature
from django.conf import settings
from django.template.loader import get_template
from django.contrib.staticfiles import finders
import weasyprint
from jinja2 import Environment, FileSystemLoader

from graphql_jwt.utils import get_payload
from graphql_jwt.shortcuts import get_user_by_payload

from PrimeBankApp.roles import is_manager_of
from .models import CustomUser, TimeClock

def _authenticate_request_with_jwt(request):
    """
    Same auth logic as CSV export.
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


def export_timeclock_pdf(request, token: str):
    """
    GET /api/export/timeclock/pdf/<token>/
    """
    print(f"\n=== DEBUG: PDF Export Request Started ===")
    print(f"DEBUG: Token (first 80 chars): {token[:80]}...")
    print(f"DEBUG: Token length: {len(token)}")
    print(f"DEBUG: Request user authenticated: {request.user.is_authenticated}")
    print(f"DEBUG: Request user: {request.user}")
    
    # 1) Authentication
    if not request.user.is_authenticated:
        print(f"DEBUG: User not authenticated, trying JWT auth...")
        user = _authenticate_request_with_jwt(request)
        print(f"DEBUG: JWT auth result: {user}")
        if user is None:
            print(f"DEBUG: JWT auth failed, returning 403")
            return HttpResponseForbidden("Auth required")
        request.user = user
        print(f"DEBUG: User now authenticated as: {request.user}")

    # 2) Validate Token
    print(f"\nDEBUG: Starting token validation...")
    signer = TimestampSigner()
    print(f"DEBUG: TimestampSigner created")
    try:
        # Unsign to get the base64 string
        print(f"DEBUG: Attempting to unsign token with max_age=900")
        unsigned_b64 = signer.unsign(token, max_age=900)  # 15 minutes
        print(f"DEBUG: Successfully unsigned! Result (first 80 chars): {str(unsigned_b64)[:80]}...")
        
        # Decode base64 to JSON string
        print(f"DEBUG: Attempting base64 decode...")
        raw_json = base64.urlsafe_b64decode(unsigned_b64).decode()
        print(f"DEBUG: Base64 decoded successfully: {raw_json[:100]}...")
        
        print(f"DEBUG: Attempting JSON parse...")
        data = json.loads(raw_json)
        print(f"DEBUG: JSON parsed successfully: {data}")
    except BadSignature:
        print(f"DEBUG: BadSignature for token: {token}")
        return HttpResponseBadRequest("Invalid or expired token")
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as e:
        print(f"DEBUG: Token decode error: {e}")
        return HttpResponseBadRequest("Invalid token payload")

    requester_id = data.get("requester_id")
    target_user_id = data.get("target_user_id")
    start_s = data.get("start_date")
    end_s = data.get("end_date")
    
    print(f"\nDEBUG: Extracted from token:")
    print(f"  requester_id: {requester_id}")
    print(f"  target_user_id: {target_user_id}")
    print(f"  start_date: {start_s}")
    print(f"  end_date: {end_s}")
    print(f"  current request.user.id: {request.user.id}")

    # 3) Check Requester
    print(f"\nDEBUG: Checking if request.user.id ({request.user.id}) == requester_id ({requester_id})")
    if str(request.user.id) != str(requester_id):
        print(f"DEBUG: Requester mismatch! Returning 403")
        return HttpResponseForbidden("Unauthorized")

    # 4) Check Target & Permissions
    print(f"\nDEBUG: Looking up target user with ID: {target_user_id}")
    try:
        target_user = CustomUser.objects.get(pk=target_user_id)
        print(f"DEBUG: Found target user: {target_user}")
    except CustomUser.DoesNotExist:
        print(f"DEBUG: Target user not found! Returning 400")
        return HttpResponseBadRequest("Target user not found")

    is_self = str(request.user.id) == str(target_user_id)
    is_admin = getattr(request.user, "is_admin", False) or request.user.is_superuser
    
    if not (is_self or is_admin or is_manager_of(request.user, getattr(target_user, "team_id", None))):
        print(f"DEBUG: Permission check failed! (Self: {is_self}, Admin: {is_admin}) Returning 403")
        return HttpResponseForbidden("Not allowed")
    
    print(f"DEBUG: Permission check passed!")

    # 5) Parse Dates
    print(f"\nDEBUG: Parsing dates...")
    print(f"  start_s: {start_s} (type: {type(start_s)})")
    print(f"  end_s: {end_s} (type: {type(end_s)})")
    try:
        s = date.fromisoformat(start_s)
        e = date.fromisoformat(end_s)
        print(f"DEBUG: Dates parsed successfully: {s} to {e}")
    except Exception as ex:
        print(f"DEBUG: Date parsing failed! Error: {ex}")
        return HttpResponseBadRequest("Bad date format")


    if s > e:
        print(f"DEBUG: Date validation failed! s ({s}) > e ({e})")
        return HttpResponseBadRequest("start_date must be <= end_date")
    
    print(f"DEBUG: Date validation passed: {s} <= {e}")

    # 6) Fetch Data
    print(f"\nDEBUG: Fetching TimeClock data for user {target_user_id} from {s} to {e}")
    qs = (
        TimeClock.objects
        .filter(user_id=target_user_id, day__range=(s, e))
        .order_by("day", "clock_in")
    )
    
    print(f"DEBUG: Processing {qs.count()} TimeClock entries...")
    entries = []
    total_seconds = 0.0
    days_worked = set()

    for tc in qs:
        dur = _duration_seconds(tc.day, tc.clock_in, tc.clock_out)
        total_seconds += dur
        days_worked.add(tc.day)
        entries.append({
            "day": tc.day,
            "clock_in": tc.clock_in,
            "clock_out": tc.clock_out,
            "duration_fmt": f"{dur/3600:.2f}"
        })
    
    print(f"DEBUG: Processed {len(entries)} entries, total_seconds: {total_seconds}")

    # 7) KPIs Calculation
    total_hours = total_seconds / 3600
    num_days = len(days_worked)
    avg_daily_hours = total_hours / num_days if num_days > 0 else 0.0
    
    contract_hours = target_user.hour_contract
    contract_status = None
    if contract_hours:
        # Assuming monthly contract, but this is a specific range export. 
        # We can just show the contract vs total for this period OR leave it as informational.
        # For now, let's just show the contract value.
        pass

    # 8) Generate PDF
    # Prepare Context for Jinja2
    context = {
        "user": target_user,
        "requester": request.user,
        "start_date": s,
        "end_date": e,
        "entries": entries,
        "total_hours": f"{total_hours:.2f}",
        "avg_daily_hours": f"{avg_daily_hours:.2f}",
        "days_worked": num_days,
        "contract_hours": contract_hours,
        "generated_at": datetime.now(),
    }
    
    # Resolving logo (Same logic as before)
    logo_data_uri = ""
    try:
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        if not frontend_url: frontend_url = "http://localhost:5173"
        frontend_url = frontend_url.rstrip('/')
        logo_url = f"{frontend_url}/primebank-logo.png"
        
        import urllib.request
        with urllib.request.urlopen(logo_url, timeout=5) as response_http:
            logo_data = response_http.read()
            b64_logo = base64.b64encode(logo_data).decode('utf-8')
            logo_data_uri = f"data:image/png;base64,{b64_logo}"
    except Exception as err:
        print(f"Failed to fetch remote logo: {err}")
        try:
            current_dir = os.path.dirname(__file__)
            local_path = os.path.join(current_dir, 'static/img/logo.png')
            if not os.path.exists(local_path):
                local_path = os.path.join(settings.BASE_DIR, 'PrimeBankApp/static/img/logo.png')

            if os.path.exists(local_path):
                with open(local_path, "rb") as image_file:
                    b64_local = base64.b64encode(image_file.read()).decode('utf-8')
                    logo_data_uri = f"data:image/png;base64,{b64_local}"
            else:
                 print(f"Local logo not found at: {local_path}")
        except Exception as local_err:
             print(f"Failed to load local logo: {local_err}")

    context['logo_data_uri'] = logo_data_uri

    # Read Primary Color
    fallback_color = "#e11d48"
    raw_color = data.get("primary_color")
    if raw_color and (raw_color.startswith("#") or raw_color.startswith("rgb")):
        primary_color = raw_color
    else:
        primary_color = fallback_color
    context['primary_color'] = primary_color

    # Render Template with Jinja2
    print(f"\nDEBUG: Rendering PDF template...")
    try:
        # Assuming templates are in backend/PrimeBank/PrimeBankApp/templates
        # We need an absolute path or relative to BASE_DIR
        template_dir = os.path.join(settings.BASE_DIR, 'PrimeBankApp/templates')
        print(f"DEBUG: Template directory: {template_dir}")
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template('pdf_report.html')
        print(f"DEBUG: Template loaded successfully")
        html_string = template.render(context)
        print(f"DEBUG: Template rendered successfully, HTML length: {len(html_string)}")
    except Exception as e:
        print(f"DEBUG: Template rendering failed! Error: {e}")
        return HttpResponseBadRequest(f"Error rendering template: {str(e)}")

    # Generate PDF with WeasyPrint
    print(f"\nDEBUG: Generating PDF with WeasyPrint...")
    response = HttpResponse(content_type='application/pdf')
    filename = f'report_{target_user.id}_{s.strftime("%Y%m%d")}.pdf'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    try:
        print(f"DEBUG: Calling WeasyPrint.HTML()...")
        weasyprint.HTML(string=html_string).write_pdf(response)
        print(f"DEBUG: PDF generated successfully!")
    except Exception as e:
        print(f"DEBUG: PDF generation failed! Error: {e}")
        return HttpResponse(f'Error generating PDF: {str(e)}', status=500)

    print(f"DEBUG: Returning PDF response")
    return response
