FROM python:3.11-slim

WORKDIR /app

COPY packages/shared /app/packages/shared
COPY services/gateway-api /app/services/gateway-api

RUN pip install --no-cache-dir -r /app/packages/shared/requirements.txt
RUN pip install --no-cache-dir -r /app/services/gateway-api/requirements.txt

ENV PYTHONPATH=/app/packages:/app

WORKDIR /app/services/gateway-api

CMD ["python", "main.py"]
