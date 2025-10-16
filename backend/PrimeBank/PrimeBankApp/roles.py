from graphql import GraphQLError

def require_auth(user):
    if not user or not user.is_authenticated:
        raise GraphQLError("Authentification required.")

def is_admin(user):
    return bool(user and (user.is_admin or user.is_superuser))

# this function is used in is_manager_of
def is_manager(user):
    return bool(user and user.team_managed_id)

def is_manager_of(user, team_id: int) -> bool:
    return bool(is_manager(user) and user.team_managed_id == team_id)