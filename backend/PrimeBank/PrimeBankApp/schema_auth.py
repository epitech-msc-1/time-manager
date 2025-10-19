import graphene
import graphql_jwt
from graphql import GraphQLError
from graphql_jwt.refresh_token.models import RefreshToken
from graphql_jwt.settings import jwt_settings
from graphql_jwt.utils import jwt_payload as _default_payload


def jwt_payload(user, context=None):
    # base payload using library helper if available
    try:
        payload = _default_payload(user, context)
    except Exception:
        # Fallback minimal payload
        payload = {
            jwt_settings.JWT_PAYLOAD_GET_USERNAME_HANDLER({}): getattr(
                user, user.USERNAME_FIELD, ""
            ),
        }

    # Add useful user fields
    try:
        payload.update(
            {
                "user_id": user.id,
                "email": user.email,
                "first_name": getattr(user, "first_name", ""),
                "last_name": getattr(user, "last_name", ""),
                "is_admin": getattr(user, "is_admin", False),
                "team_id": getattr(user.team, "id", None)
                if getattr(user, "team", None)
                else None,
                "team_managed_id": getattr(user.team_managed, "id", None)
                if getattr(user, "team_managed", None)
                else None,
                "is_manager": bool(getattr(user, "team_managed_id", None)),
                "hour_contract": getattr(user, "hour_contract", None),
                "phone_number": getattr(user, "phone_number", None),
            }
        )
    except Exception:
        # Keep payload minimal on any unexpected error
        pass

    return payload


class Mutation(graphene.ObjectType):
    token_auth = graphql_jwt.ObtainJSONWebToken.Field()
    verify_token = graphql_jwt.Verify.Field()
    refresh_token = graphql_jwt.Refresh.Field()
    revoke_token = graphql_jwt.Revoke.Field()
    delete_token_cookie = graphql_jwt.DeleteJSONWebTokenCookie.Field()
    delete_refresh_token_cookie = graphql_jwt.DeleteRefreshTokenCookie.Field()


# To remove, it is only for dev purposes
class ActiveRefreshTokenType(graphene.ObjectType):
    id = graphene.ID()
    user_email = graphene.String()
    token = graphene.String()
    created = graphene.DateTime()
    revoked_at = graphene.DateTime()
    is_revoked = graphene.Boolean()


class AuthDevQuery(graphene.ObjectType):
    refresh_tokens_by_email = graphene.List(
        ActiveRefreshTokenType, email=graphene.String(required=True)
    )

    def resolve_refresh_tokens_by_email(self, info, email):
        tokens = RefreshToken.objects.filter(user__email=email)
        if not tokens.exists():
            raise GraphQLError(f"Aucun refresh token trouvé pour {email}.")
        return [
            ActiveRefreshTokenType(
                id=t.id,
                user_email=t.user.email,
                token=t.token,
                created=t.created,
                revoked_at=t.revoked,
                is_revoked=bool(t.revoked),
            )
            for t in tokens
        ]


# end to remove
