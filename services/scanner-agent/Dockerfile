FROM python:3.11-slim

WORKDIR /app

COPY packages/shared /app/packages/shared
COPY services/scanner-agent /app/services/scanner-agent

RUN pip install --no-cache-dir -r /app/packages/shared/requirements.txt
RUN pip install --no-cache-dir -r /app/services/scanner-agent/requirements.txt

ENV PYTHONPATH=/app/packages:/app

WORKDIR /app/services/scanner-agent

CMD ["python", "main.py"]
