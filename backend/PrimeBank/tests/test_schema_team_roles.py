from types import SimpleNamespace

from PrimeBankApp.schema_team import SetTeamManager, AddUserToTeam


def make_info_admin():
    # requester is authenticated and admin
    # include is_superuser to match production user attributes used by is_admin()
    return SimpleNamespace(
        context=SimpleNamespace(
            user=SimpleNamespace(is_authenticated=True, is_admin=True, is_superuser=False)
        )
    )


def make_info_manager(team_id: int):
    # requester is authenticated and manages team_id
    # include is_superuser to match production user attributes used by is_admin()
    return SimpleNamespace(
        context=SimpleNamespace(
            user=SimpleNamespace(is_authenticated=True, is_admin=False, is_superuser=False, team_managed_id=team_id)
        )
    )


def test_set_team_manager_by_admin(mocker):
    # Patch models used in the module under test
    mock_team_class = mocker.patch("PrimeBankApp.schema_team.Team")
    mock_user_class = mocker.patch("PrimeBankApp.schema_team.CustomUser")

    # Prepare a team with an existing current manager
    current_manager = mocker.Mock()
    current_manager.id = 5
    current_manager.team_managed = mocker.Mock()
    current_manager.save = mocker.Mock()

    mock_team = mocker.Mock()
    mock_team.id = 10
    # team.team_manager returns the current manager
    mock_team.team_manager = current_manager
    mock_team_class.objects.get.return_value = mock_team

    # Prepare the new manager
    new_manager = mocker.Mock()
    new_manager.id = 2
    new_manager.save = mocker.Mock()
    mock_user_class.objects.get.return_value = new_manager

    info = make_info_admin()

    # Call mutation
    result = SetTeamManager.mutate(None, info, team_id=mock_team.id, manager_user_id=new_manager.id)

    # Check return values
    assert result.ok is True
    assert result.team_id_out == mock_team.id
    assert result.manager_user_id_out == new_manager.id

    # previous manager should have been unset and saved
    assert current_manager.team_managed is None
    current_manager.save.assert_called_once()

    # new manager should have team_managed set to the team and saved
    assert new_manager.team_managed is mock_team
    new_manager.save.assert_called_once()


def test_add_user_to_team_by_admin_and_manager(mocker):
    # Patch models used in the module under test
    mock_user_class = mocker.patch("PrimeBankApp.schema_team.CustomUser")
    mock_team_class = mocker.patch("PrimeBankApp.schema_team.Team")

    # Prepare the user to add
    user_to_add = mocker.Mock()
    user_to_add.is_admin = False
    # initially user has no team
    user_to_add.team_id = None
    user_to_add.save = mocker.Mock()
    mock_user_class.objects.get.return_value = user_to_add

    # Prepare the team
    mock_team = mocker.Mock()
    # members.count() should return a number; simulate 3 members after add
    mock_team.members.count.return_value = 3
    mock_team_class.objects.get.return_value = mock_team

    # --- Admin adds the user ---
    info_admin = make_info_admin()
    result_admin = AddUserToTeam.mutate(None, info_admin, user_id=1, team_id=10)

    # The mutation should return the team object
    assert result_admin.team is mock_team
    # user.team should have been set and save called
    assert user_to_add.team is mock_team
    user_to_add.save.assert_called()
    # nr_members should be set from members.count()
    assert getattr(mock_team, "nr_members", None) == mock_team.members.count.return_value

    # Reset mocks for manager case
    user_to_add.save.reset_mock()
    mock_team.nr_members = None

    # --- Manager (manages team 10) adds the user ---
    info_manager = make_info_manager(team_id=10)
    result_manager = AddUserToTeam.mutate(None, info_manager, user_id=1, team_id=10)

    assert result_manager.team is mock_team
    assert user_to_add.team is mock_team
    user_to_add.save.assert_called()
    assert getattr(mock_team, "nr_members", None) == mock_team.members.count.return_value
