FROM python:3.11-slim

WORKDIR /app

COPY packages/shared /app/packages/shared
COPY services/patch-agent /app/services/patch-agent

RUN pip install --no-cache-dir -r /app/packages/shared/requirements.txt
RUN pip install --no-cache-dir -r /app/services/patch-agent/requirements.txt

ENV PYTHONPATH=/app/packages:/app

WORKDIR /app/services/patch-agent

CMD ["python", "main.py"]
