from . import models
from . import wizard
from . import controllers

import os
import hashlib
import stat  # Import the stat module

# def generate_file_checksum(filename, hash_factory=hashlib.sha256, chunk_num_blocks=128):
#     """Generate a checksum for a single file."""
#     hash_obj = hash_factory()
#     with open(filename, 'rb') as f:
#         for chunk in iter(lambda: f.read(chunk_num_blocks * hash_obj.block_size), b''):
#             hash_obj.update(chunk)
#     return hash_obj.hexdigest()
            
# def generate_checksum_for_directory(directory_path):
#     """Generate checksums for all files in a directory and write to a checksum file."""
#     checksums = []
#     for root, dirs, files in os.walk(directory_path):
#         for file in files:
#             # Skip the checksum file itself to avoid a changing checksum
#             if file == 'ZooryaPOS.exe':
#                 continue
#             file_path = os.path.join(root, file)
#             file_checksum = generate_file_checksum(file_path)
#             checksums.append((file_path, file_checksum))
    
#     checksum_file_path = os.path.join(directory_path, 'ZooryaPOS.exe')
#     # Ensure the directory is writable before attempting to write the checksum file
#     try:
#         # Try setting the directory writable by the owner
#         os.chmod(directory_path, stat.S_IWUSR | stat.S_IRUSR | stat.S_IXUSR)
#     except PermissionError:
#         print(f"Unable to change permissions for {directory_path}.")
    
#     with open(checksum_file_path, 'w') as checksum_file:
#         for path, checksum in checksums:
#             checksum_file.write(f"{path}: {checksum}\n")

# def post_install_hook(cr):
#     # cr.env['ir.config_parameter'].sudo().set_param('pos_etta.log_password', '1234')
#     module_directory_path = os.path.dirname(os.path.abspath(__file__))
#     generate_checksum_for_directory(module_directory_path)