#!/bin/sh

# Default to UID 1000/GID 1000 if variables aren't provided
USER_ID=${PUID:-1000}
GROUP_ID=${PGID:-1000}

# Validate that USER_ID and GROUP_ID are non-negative integers
case "$USER_ID" in
  *[!0-9]*) echo "ERROR: PUID must be a non-negative integer, got: '$USER_ID'" >&2; exit 1 ;;
esac
case "$GROUP_ID" in
  *[!0-9]*) echo "ERROR: PGID must be a non-negative integer, got: '$GROUP_ID'" >&2; exit 1 ;;
esac

echo "Updating 'app' user to UID: $USER_ID and GID: $GROUP_ID"

# Update the 'app' user and group created in the Dockerfile
sed -i "s/^app:x:[0-9]*:[0-9]*:/app:x:$USER_ID:$GROUP_ID:/" /etc/passwd
sed -i "s/^app:x:[0-9]*:/app:x:$GROUP_ID:/" /etc/group

# Ensure the app can write to its data directory
chown -R app:app /data /app

# Run the command passed to the container as the 'app' user
exec su-exec app "$@"