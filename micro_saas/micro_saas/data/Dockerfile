# Use the same base image as the running container
FROM postgres:12

# Set environment variables (from your docker compose)
ENV POSTGRES_PASSWORD=odoo
ENV POSTGRES_USER=odoo
ENV POSTGRES_DB=postgres

# Copy the persistent data into the image
COPY data /var/lib/postgresql/data

# Ensure proper permissions (optional, adjust as needed)
RUN chown -R postgres:postgres /var/lib/postgresql/data