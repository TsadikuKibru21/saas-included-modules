#!/bin/bash


NAME=$1
BACKUP_NAME=$2

SFS=/root/sfs_zoorya
BACKUP_DIR=$SFS/images.bk
STORAGE_DIR=$SFS/images

DIR="$STORAGE_DIR/$NAME"

MOUNT=/mnt/micro_saas/"$NAME"

IMG_FILE="$DIR.img"
BACKUP_IMG="$BACKUP_DIR"/"$BACKUP_NAME"

# unmount
umount "$MOUNT"

# copy the backup image
cp "$BACKUP_IMG" "$IMG_FILE"

# mount the new image
mount -o loop "$IMG_FILE" "$MOUNT"


# clean network and volume
docker volume prune -f
docker network prune -f