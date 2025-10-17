from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

# Create your models here.

class Team(models.Model):
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        # 'members' come from the related_name in CustomUser model
        return f"Team {self.pk} — {self.members.count()} member(s)"
    
class CustomUser(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    is_admin = models.BooleanField(default=False)
    team_managed = models.OneToOneField(
        Team, on_delete=models.SET_NULL, related_name="team_manager", null=True
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        related_name="members",  # really important to count the nr of members in a team
        null=True,
        blank=True,
    )
    hour_contract = models.IntegerField(null=True) 

    # Indique que l'email est le champ utilisé pour l'authentification -> obligatoire si on supprime username
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    
    def __str__(self):
        return f"User {self.id} is {self.first_name} {self.last_name} with email {self.email}"
    
class TimeClock(models.Model):
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name="user_time_clock"
    )
    
    day = models.DateField(default=timezone.localdate)
    clock_in = models.TimeField(null=True)
    clock_out = models.TimeField(null=True)


    # permet de trier les entrées par date décroissante
    class Meta:
        ordering = ["-day", "-clock_in"]

    def __str__(self):
        return f"This user {self.user_id} clocked in at {self.clock_in.date()} and clock out at {self.clock_out.date()}"