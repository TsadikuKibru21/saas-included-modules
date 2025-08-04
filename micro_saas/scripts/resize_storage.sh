#!/bin/bash

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root using: sudo $0"
    exit 1
fi

# Exit if less than 2 arguments are passed
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <name> <size_in_GB>"
    exit 1
fi

# Check if bc is installed
if ! command -v bc >/dev/null 2>&1; then
    echo "Error: bc is required for floating-point calculations. Please install it."
    exit 1
fi

SFS=/root/sfs_zoorya
STORAGE_DIR=$SFS/images
NAME=$1
SIZE=$2  # Size in GB, e.g., 2.5 for 2.5GB
DIR="$STORAGE_DIR/$NAME"
MOUNT=/mnt/micro_saas/"$NAME"
IMG_FILE="$DIR.img"

# Check if the image file exists
if [ ! -f "$IMG_FILE" ]; then
    echo "Error: $IMG_FILE does not exist"
    exit 1
fi

# Check if the image is mounted
MOUNT_CHECK=$(mount | grep "$MOUNT")
if [ -z "$MOUNT_CHECK" ]; then
    echo "Error: $IMG_FILE is not mounted at $MOUNT. Please mount it first."
    exit 1
fi

# Get the current loop device
LOOP_DEV=$(losetup -j "$IMG_FILE" | awk -F: '{print $1}')
if [ -z "$LOOP_DEV" ]; then
    echo "Error: No loop device associated with $IMG_FILE"
    exit 1
fi

# Get the current size of the image file in bytes
CURRENT_SIZE=$(stat -c%s "$IMG_FILE")
CURRENT_SIZE_GB=$(echo "scale=2; $CURRENT_SIZE / (1024 * 1024 * 1024)" | bc)

# Convert new size from GB to bytes using bc
NEW_SIZE=$(echo "scale=0; $SIZE * 1024 * 1024 * 1024" | bc)  # Convert GB to bytes, rounded to integer

# Check if the new size is a valid number
if ! echo "$SIZE" | grep -qE '^[0-9]+(\.[0-9]+)?$'; then
    echo "Error: Size must be a positive number (e.g., 2 or 2.5)"
    exit 1
fi

# Check if the new size is greater than the current size
if (( $(echo "$SIZE <= $CURRENT_SIZE_GB" | bc -l) )); then
    echo "Error: New size (${SIZE}GB) must be greater than current size (${CURRENT_SIZE_GB}GB)"
    exit 1
fi

# Resize the image file using truncate
echo "Resizing $IMG_FILE to ${SIZE}GB..."
truncate -s "$NEW_SIZE" "$IMG_FILE" || {
    echo "Failed to resize $IMG_FILE with truncate"
    exit 1
}

# Update the loop device to recognize the new size without detaching
echo "Updating loop device $LOOP_DEV..."
losetup -c "$LOOP_DEV" || {
    echo "Failed to update loop device $LOOP_DEV"
    exit 1
}

# Resize the filesystem online
echo "Resizing filesystem on $LOOP_DEV..."
resize2fs "$LOOP_DEV" || {
    echo "Failed to resize filesystem on $LOOP_DEV. Online resizing may not be supported."
    exit 1
}

echo "Resize complete. $IMG_FILE is now ${SIZE}GB and remains mounted at $MOUNT"
exit 0