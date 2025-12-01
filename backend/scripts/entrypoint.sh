#!/bin/bash

uv run PrimeBank/manage.py migrate
uv run PrimeBank/manage.py runserver 0.0.0.0:${DJANGO_PORT}