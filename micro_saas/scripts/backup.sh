#!/bin/bash


SFS=/root/sfs_zoorya
BACKUP_DIR=$SFS/images.bk
STORAGE_DIR=$SFS/images
NAME=$1
DIR="$STORAGE_DIR/$NAME"
IMG_FILE="$DIR.img"

BACKUP_NAME=$2

SERVER_HOST=$3
SERVER_USER=$4
SERVER_PASSWORD=$5

echo "started scp"
# cp "$IMG_FILE" "$BACKUP_DIR"/"$BACKUP_NAME"
# /usr/bin/sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER"@"$SERVER_HOST" "mkdir -p $BACKUP_DIR"
# /usr/bin/sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no "$IMG_FILE" "$SERVER_USER"@"$SERVER_HOST":"$BACKUP_DIR"/"$BACKUP_NAME"

cp "$IMG_FILE" "$BACKUP_DIR"/"$BACKUP_NAME"

echo "completed scp"