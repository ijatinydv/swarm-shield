FROM python:3.11-slim

WORKDIR /app

COPY packages/shared /app/packages/shared
COPY services/ci-agent /app/services/ci-agent

RUN pip install --no-cache-dir -r /app/packages/shared/requirements.txt
RUN pip install --no-cache-dir -r /app/services/ci-agent/requirements.txt

ENV PYTHONPATH=/app/packages:/app

WORKDIR /app/services/ci-agent

CMD ["python", "main.py"]
