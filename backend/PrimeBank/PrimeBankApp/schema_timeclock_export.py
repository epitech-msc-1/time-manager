# PrimeBankApp/schema_timeclock_export.py

import json
from datetime import timedelta
import graphene
from django.core.signing import TimestampSigner
from django.utils import timezone
from graphql import GraphQLError

from PrimeBankApp.roles import is_manager_of
from .models import CustomUser

DATE_FMT = "%Y-%m-%d"

class TimeClockCSVExport(graphene.ObjectType):
    download_url = graphene.String(required=True)
    filename = graphene.String(required=True)
    expires_at = graphene.DateTime(required=True)

class TimeClockExportQuery(graphene.ObjectType):
    """
    Génère une URL signée pour télécharger le CSV via la view /api/export/timeclock/csv/<token>/
    Règle d'accès: self OU manager du team de l'utilisateur cible.
    """
    export_time_clock_csv = graphene.Field(
        TimeClockCSVExport,
        user_id=graphene.ID(required=False),          # si absent => user courant
        start_date=graphene.Date(required=False),     # défaut: aujourd'hui
        end_date=graphene.Date(required=False),       # défaut: aujourd'hui
        separator=graphene.String(required=False, default_value=";"),  # utile pour Excel FR
    )

    def resolve_export_time_clock_csv(self, info, user_id=None, start_date=None, end_date=None, separator=";"):
        request_user = info.context.user
        if not request_user or not request_user.is_authenticated:
            raise GraphQLError("Authentication required")

        # cible
        if user_id is None:
            target_user = request_user
        else:
            try:
                target_user = CustomUser.objects.get(pk=user_id)
            except CustomUser.DoesNotExist:
                raise GraphQLError("Requested user does not exist.")

        # autorisations: self OU manager
        target_team_id = getattr(target_user, "team_id", None)
        is_self_request = str(request_user.id) == str(target_user.id)
        if not (is_self_request or is_manager_of(request_user, target_team_id)):
            raise GraphQLError("Not authorized to export time clocks for this user.")

        # plage de dates (défaut: aujourd'hui..aujourd'hui)
        today = timezone.localdate()
        s = start_date or today
        e = end_date or today
        if s > e:
            raise GraphQLError("start_date must be <= end_date.")

        # token signé attendu par ta view /api/export/timeclock/csv/<token>/
        signer = TimestampSigner()
        payload = {
            "requester_id": str(request_user.id),
            "target_user_id": str(target_user.id),
            "start_date": s.strftime(DATE_FMT),
            "end_date": e.strftime(DATE_FMT),
            "sep": separator,
        }
        token = signer.sign(json.dumps(payload))

        filename = f'timeclocks_{target_user.id}_{s.strftime("%Y%m%d")}_{e.strftime("%Y%m%d")}.csv'

        return TimeClockCSVExport(
            download_url=f"/api/export/timeclock/csv/{token}/",
            filename=filename,
            expires_at=timezone.now() + timedelta(minutes=15),
        )
