import graphene
from graphene_django import DjangoObjectType
from django.db.models import Count
from graphql import GraphQLError
from .models import Team  

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

# Mutation to import in schema.py
class TeamMutation(graphene.ObjectType):
    create_team = CreateTeam.Field()
    update_team = UpdateTeam.Field()
    delete_team = DeleteTeam.Field()
