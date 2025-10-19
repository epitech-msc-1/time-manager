"""
GraphQL schema for user management.

This module provides:
- UserType: GraphQL type for User model
- UserQuery: queries to fetch users (all, by id, by email)
- UserMutation: mutations to create, update and delete users
"""

import graphene
from django.contrib.auth import get_user_model
from graphene_django import DjangoObjectType
from graphql import GraphQLError

from PrimeBankApp.roles import is_admin, is_manager, require_auth

# Get the user model, here the CustomUser
User = get_user_model()


class UserType(DjangoObjectType):
    """Expose core user attributes through the GraphQL schema layer."""

    class Meta:
        """meta."""

        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "hour_contract",
            "team",
            "team_managed",
            "is_admin",
        )


# Query to import in schema.py
class UserQuery(graphene.ObjectType):
    """Expose user-centric GraphQL query resolvers."""

    users = graphene.List(UserType)
    user = graphene.Field(UserType, id=graphene.ID(required=True))
    user_by_email = graphene.Field(UserType, email=graphene.String(required=True))

    def resolve_users(self, info):
        return User.objects.all().order_by("id")

    def resolve_user(self, info, id):
        return User.objects.get(pk=id)

    def resolve_user_by_email(self, info, email):
        requester = info.context.user
        require_auth(requester)

        if not (is_admin(requester) or is_manager(requester)):
            raise GraphQLError("Access denied.")

        try:
            target_user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise GraphQLError("User not found.")

        if target_user.is_admin and not is_admin(requester):
            raise GraphQLError("Managers cannot target admin users.")

        return target_user


class CreateUser(graphene.Mutation):
    class Arguments:
        email = graphene.String(required=True)
        password = graphene.String(required=True)
        phone_number = graphene.String(required=True)
        first_name = graphene.String(required=True)
        last_name = graphene.String(required=True)
        hour_contract = graphene.Int()
        team_id = graphene.ID()
        team_managed_id = graphene.ID()
        is_admin = graphene.Boolean()

    user = graphene.Field(UserType)

    @classmethod
    def mutate(
        cls,
        root,
        info,
        email,
        password,
        phone_number,
        first_name,
        last_name,
        hour_contract=None,
        team_id=None,
        team_managed_id=None,
        is_admin=False,
    ):
        if User.objects.filter(email=email).exists():
            raise GraphQLError("Email already in use.")
        if User.objects.filter(phone_number=phone_number).exists():
            raise GraphQLError("Phone number already in use.")
        u = User(
            email=email,
            phone_number=phone_number,
            first_name=first_name,
            last_name=last_name,
            hour_contract=hour_contract,
            team_id=team_id,
            team_managed_id=team_managed_id,
            is_admin=is_admin,
        )

        # hash the password
        u.set_password(password)
        u.save()
        return CreateUser(user=u)


class UpdateUser(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)
        email = graphene.String()
        password = graphene.String()
        phone_number = graphene.String()
        first_name = graphene.String()
        last_name = graphene.String()
        hour_contract = graphene.Int()
        team_id = graphene.ID()
        team_managed_id = graphene.ID()
        is_admin = graphene.Boolean()

    user = graphene.Field(UserType)

    @classmethod
    # **data to get field given by client
    def mutate(cls, root, info, id, **data):
        try:
            u = User.objects.get(pk=id)
        except User.DoesNotExist:
            raise GraphQLError("User not found.")

        # if email is changing, ensure it's unique
        new_email = data.get("email")
        if new_email and User.objects.filter(email=new_email).exclude(pk=id).exists():
            raise GraphQLError("Email already in use.")

        # password handling
        pwd = data.pop("password", None)
        if pwd:
            u.set_password(pwd)

        # update other fields
        for field in [
            "email",
            "phone_number",
            "first_name",
            "last_name",
            "hour_contract",
            "team_id",
            "team_managed_id",
        ]:
            if field in data:
                setattr(u, field, data[field])

        u.save()
        return UpdateUser(user=u)


class DeleteUser(graphene.Mutation):
    class Arguments:
        id = graphene.ID(required=True)

    ok = graphene.Boolean()

    @classmethod
    def mutate(cls, root, info, id):
        # .delete() returns a tuple (number of objects deleted, {object_type: number}) since we don't need the second part we use _
        deleted, _ = User.objects.filter(pk=id).delete()
        return DeleteUser(ok=bool(deleted))


# Mutation to import in schema.py
class UserMutation(graphene.ObjectType):
    create_user = CreateUser.Field()
    update_user = UpdateUser.Field()
    delete_user = DeleteUser.Field()
