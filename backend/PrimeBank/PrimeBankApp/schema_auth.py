import graphene
import graphql_jwt
from graphql_jwt.refresh_token.models import RefreshToken
from graphql import GraphQLError

class Mutation(graphene.ObjectType):
    token_auth = graphql_jwt.relay.ObtainJSONWebToken.Field()
    verify_token = graphql_jwt.relay.Verify.Field()
    refresh_token = graphql_jwt.relay.Refresh.Field()
    revoke_token = graphql_jwt.relay.Revoke.Field()
    delete_token_cookie = graphql_jwt.relay.DeleteJSONWebTokenCookie.Field()


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
        ActiveRefreshTokenType,
        email=graphene.String(required=True)
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