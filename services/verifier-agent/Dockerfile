FROM python:3.11-slim

WORKDIR /app

COPY packages/shared /app/packages/shared
COPY services/verifier-agent /app/services/verifier-agent

RUN pip install --no-cache-dir -r /app/packages/shared/requirements.txt
RUN pip install --no-cache-dir -r /app/services/verifier-agent/requirements.txt

ENV PYTHONPATH=/app/packages:/app

WORKDIR /app/services/verifier-agent

CMD ["python", "main.py"]
