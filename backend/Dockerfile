FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pisha_backend.settings
ENV DEBUG=True

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

RUN python manage.py collectstatic --noinput

RUN addgroup --system app && adduser --system --ingroup app app \
    && mkdir -p /app/media \
    && chown -R app:app /app

USER app

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "pisha_backend.wsgi:application"]
