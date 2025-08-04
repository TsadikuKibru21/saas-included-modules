#!/bin/bash

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root using: sudo $0"
    exit 1
fi

# Exit if no argument is passed
if [ -z "$1" ]; then
    echo "Usage: $0 <name>"
    exit 1
fi

SFS=/root/sfs_zoorya
STORAGE_DIR=$SFS/images
NAME=$1
DIR="$STORAGE_DIR/$NAME"
MOUNT=/mnt/micro_saas/"$NAME"
IMG_FILE="$DIR.img"

# Create storage directory if it doesn’t exist
mkdir -p "$STORAGE_DIR" || { echo "Failed to create $STORAGE_DIR"; exit 1; }

# Create mount point
mkdir -p "$MOUNT" || { echo "Failed to create $MOUNT"; exit 1; }

# If $IMG_FILE already exists, try to mount it and exit
if [ -e "$IMG_FILE" ]; then
    echo "Note: $IMG_FILE already exists, attempting to mount..."
    mount -o loop "$IMG_FILE" "$MOUNT" && {
        echo "Successfully mounted $IMG_FILE at $MOUNT"
        exit 0
    } || {
        echo "Failed to mount $IMG_FILE"
        exit 1
    }
fi

# Allocate storage with dd (fallocate replacement)
echo "Creating $IMG_FILE (2GB)..."
dd if=/dev/zero of="$IMG_FILE" bs=1M count=2048 status=progress || {
    echo "Failed to create $IMG_FILE with dd"
    exit 1
}

# Format as ext4
echo "Formatting $IMG_FILE as ext4..."
mkfs.ext4 "$IMG_FILE" -F || {  # -F forces formatting even if it’s not a block device
    echo "Failed to format $IMG_FILE"
    rm -f "$IMG_FILE"  # Clean up on failure
    exit 1
}

# Mount storage
echo "Mounting $IMG_FILE at $MOUNT..."
mount -o loop "$IMG_FILE" "$MOUNT" || {
    echo "Failed to mount $IMG_FILE"
    rm -f "$IMG_FILE"  # Clean up on failure
    exit 1
}

# Create directories inside the mounted image
mkdir -p "$MOUNT/db" "$MOUNT/odoo" || {
    echo "Failed to create directories in $MOUNT"
    umount "$MOUNT"
    rm -f "$IMG_FILE"
    exit 1
}

# Clean Docker resources
docker volume prune -f
docker network prune -f

echo "Storage setup complete. Mounted $IMG_FILE at $MOUNT"
exit 0