import graphene
from graphene_django import DjangoObjectType
from django.db.models import Count
from graphql import GraphQLError
from .models import Team, CustomUser  
from PrimeBankApp.roles import require_auth, is_admin, is_manager_of

class TeamType(DjangoObjectType):
    nr_members = graphene.Int()

    class Meta:
        model = Team
        fields = ("id", "description")
        
# Query to import in schema.py
class TeamQuery(graphene.ObjectType):
    team = graphene.Field(TeamType, id=graphene.ID(required=True))
    teams = graphene.List(TeamType)

    def resolve_teams(self, info):
        return Team.objects.annotate(nr_members=Count("members", distinct=True)).all().order_by("id")
    

    def resolve_team(self, info, id):
        # members is the related_name in CustomUser model
        try:
            return (
                Team.objects.annotate(nr_members=Count("members", distinct=True)).get(pk=id))
        except Team.DoesNotExist:
                raise GraphQLError(f"Équipe id={id} introuvable.")

class CreateTeam(graphene.Mutation):
    class Arguments:
        description = graphene.String()

    team = graphene.Field(TeamType)

    @classmethod
    def mutate(cls, root, info, description=None):
        user = info.context.user
        require_auth(user)
        if not is_admin(user):
            raise GraphQLError("Access denied, admin only.")

        t = Team.objects.create(description=description)
        # we set nr_members to 0 since a new team has no members, it is required because the graphql type expects it
        t.nr_members = 0
        return CreateTeam(team=t)


class UpdateTeam(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        description = graphene.String()

    team = graphene.Field(TeamType)

    @classmethod
    def mutate(cls, root, info, id, description=None):
        try:
            t = Team.objects.get(pk=id)
        except Team.DoesNotExist:
            raise GraphQLError("Team not found.")

        if description is not None:
            t.description = description
            t.save()

        # same as create, we need to set nr_members since it is required in the graphql type
        t.nr_members = t.members.count()
        return UpdateTeam(team=t)


class DeleteTeam(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean()

    @classmethod
    def mutate(cls, root, info, id):
        # .delete() returns a tuple (number of objects deleted, {object_type: number}) since we don't need the second part we use _
        deleted, _ = Team.objects.filter(pk=id).delete()
        return DeleteTeam(ok=bool(deleted))

class AddUserToTeam(graphene.Mutation):
    class Arguments:
        user_id = graphene.ID(required=True)
        team_id = graphene.ID(required=True)

    team = graphene.Field(TeamType)

    @classmethod
    def mutate(cls, root, info, user_id, team_id):
        user = info.context.user
        require_auth(user)
        if not (is_admin(user) or is_manager_of(user, int(team_id))):
            raise GraphQLError("Not authorized to add user to this team.")
    
        try:
            u = CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            raise GraphQLError("User not found.")
        
        try:
            t = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            raise GraphQLError("Team not found.")
        
        u.team = t
        u.save()
        
        # same as create, we need to set nr_members since it is required in the graphql type
        t.nr_members = t.members.count()
        return AddUserToTeam(team=t)

class SetTeamManager(graphene.Mutation):
    class Arguments:
        team_id = graphene.ID(required=True)
        manager_user_id = graphene.ID(required=True)

    ok = graphene.Boolean()
    team_id_out = graphene.ID()
    manager_user_id_out = graphene.ID()

    @classmethod
    def mutate(cls, root, info, team_id, manager_user_id):
        requester = info.context.user
        require_auth(requester)

        # Admin only
        if not is_admin(requester):
            raise GraphQLError("Access denied, admin only.")

        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            raise GraphQLError("Team not found.")

        try:
            new_manager = CustomUser.objects.get(pk=manager_user_id)
        except CustomUser.DoesNotExist:
            raise GraphQLError("User not found.")

        # If the team already has a manager, replace it with the new one
        current_manager = getattr(team, "team_manager", None)
        # Gather the current manager and if it is different from the new one, unset its team_managed
        if current_manager and current_manager.id != new_manager.id:
            current_manager.team_managed = None
            current_manager.save()

        new_manager.team_managed = team
        new_manager.save()

        return SetTeamManager(ok=True, team_id_out=team.id, manager_user_id_out=new_manager.id)

# Mutation to import in schema.py
class TeamMutation(graphene.ObjectType):
    create_team = CreateTeam.Field()
    update_team = UpdateTeam.Field()
    delete_team = DeleteTeam.Field()
    add_user_to_team = AddUserToTeam.Field()
    set_team_manager = SetTeamManager.Field()
