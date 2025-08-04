# -*- coding: utf-8 -*-
import subprocess
import sys
from io import StringIO
from odoo.exceptions import UserError, ValidationError

try:
    import paramiko

    subprocess.check_call([sys.executable, "-m", "pip", "install", "webssh"])
except Exception:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "--upgrade", "poetry"]
    )
    subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko"])
    subprocess.check_call([sys.executable, "-m", "pip", "install", "webssh"])
from odoo import _, models
import logging
import os

_logger = logging.getLogger(__name__)


class ServerUtil(models.AbstractModel):
    _name = "server.util"
    _description = "Server utils"

    def login_remote(self, context):
        try:
            ssh_obj = paramiko.SSHClient()
            ssh_obj.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            path = self.env["ir.config_parameter"].get_param(
                "se_server_management.ssh_key_store_path", False
            )
            if path:
                privatekeyfile = os.path.expanduser(os.path.join(path, context["name"]))
                mykey = paramiko.RSAKey.from_private_key_file(privatekeyfile)
            else:
                kf = StringIO()
                kf.write(context["sshkey"])
                kf.seek(0)
                mykey = paramiko.RSAKey.from_private_key(
                    kf, password=context["passkey"]
                )
            ssh_obj.connect(
                hostname=context["host"],
                username=context["user"],
                port=context["port"],
                pkey=mykey,
            )
            return ssh_obj, False
        except Exception as e:
            _logger.info("++************Login remote******************++%r", str(e))
            return False, e
        return False, True

    """
    def rsync_up(self, context,dlt="yes"):
        env.host_string = context['user']+"@"+context['host']
        env.password = context['password']
        rsync_project(context['remote_path'],context['local_path']  + "/", delete= True if dlt == "yes" else False)

    def rsync_down(self, context,dlt="yes"):
        try:
            env.host_string = context['user']+"@"+context['host']
            env.password = context['password']
            output = local("rsync -pthrvz {0}:{1}/ {2} {3}".format(env.host_string, context['remote_path'], context['local_path'], "--delete" if dlt == "yes" else ""))
            _logger.info(output)
        except Exception as e:
            _logger.info("+++++++++++++ERRROR++++%r",e)
            raise Exception("+++++++++++++ERRROR++++%r",e)
    """

    def copy_remote_file(self, ssh_obj, local_dir, remote_dir):
        try:
            ftp_client = ssh_obj.open_sftp()
            ftp_client.put(local_dir, remote_dir)
            ftp_client.close()
        except Exception as e:
            _logger.info("+++++++++++++ERRROR++++%r", e)

    def execute_on_local_shell(self, cmd, directorio=None):
        res = []
        try:
            res = subprocess.check_output(
                cmd, stderr=subprocess.STDOUT, shell=True, cwd=directorio
            )
            _logger.info("-----------COMMAND RESULT--------%r", res)
            return res
        except Exception as e:
            _logger.info("+++++++++++++ERRROR++++%r", e)

    def execute_on_remote_shell(self, ssh_obj, command, directorio=None):
        _logger.info(command)
        resp = []
        try:
            if directorio:
                ssh_obj.chdir(directorio)
            ssh_stdin, ssh_stdout, ssh_stderr = ssh_obj.exec_command(command)
            err = ssh_stderr.read()
            resp = ssh_stdout.readlines()
            _logger.info(resp)
            return resp, err

        except Exception as e:
            _logger.info("+++ERROR++ %s", command)
            _logger.info("++++++++++ERROR++++%r", e)
            return resp

    def get_general_info(self, remote, context):
        resp = {}
        if remote:
            ssh_obj, error = self.login_remote(context)
            if ssh_obj:
                host_name = self.execute_on_remote_shell(ssh_obj, "hostname")
                # memory,error = self.execute_on_remote_shell(ssh_obj, 'cat /proc/meminfo|grep "MemTotal:"|tr -s "'" "'"|cut -d "'" "'" -f 2')
                memTotal = self.execute_on_remote_shell(
                    ssh_obj,
                    'cat /proc/meminfo|grep "MemTotal:"|tr -s "'
                    " "
                    '"|cut -d "'
                    " "
                    '" -f 2',
                )
                memLibre = self.execute_on_remote_shell(
                    ssh_obj,
                    'cat /proc/meminfo|grep "MemFree:"|tr -s "'
                    " "
                    '"|cut -d "'
                    " "
                    '" -f 2',
                )
                memDisp = self.execute_on_remote_shell(
                    ssh_obj,
                    'cat /proc/meminfo|grep "MemAvailable:"|tr -s "'
                    " "
                    '"|cut -d "'
                    " "
                    '" -f 2',
                )
                # swapTotal=self.execute_on_remote_shell(ssh_obj,'cat /proc/meminfo|grep "SwapTotal:"|tr -s "'" "'"|cut -d "'" "'" -f 2')
                # swapLibre=self.execute_on_remote_shell(ssh_obj,'cat /proc/meminfo|grep "SwapFree:"|tr -s "'" "'"|cut -d "'" "'" -f 2')
                modelo = self.execute_on_remote_shell(
                    ssh_obj, 'cat /proc/cpuinfo | grep "model name"'
                )
                numNucleos = self.execute_on_remote_shell(
                    ssh_obj, 'cat /proc/cpuinfo | grep "cpu cores"'
                )
                tamCache = self.execute_on_remote_shell(
                    ssh_obj, 'cat /proc/cpuinfo | grep "cache size"'
                )
                cpuLoad = self.execute_on_remote_shell(ssh_obj, "cat /proc/loadavg")
                storageInfo = self.execute_on_remote_shell(
                    ssh_obj,
                    "df -H -x overlay -x devtmpfs -x tmpfs --output=size,used,avail --total",
                )

                resp = {
                    "host_name": host_name[0],
                    "memory_total": memTotal[0],
                    "memory_total_free": memLibre[0],
                    "memory_usage": memDisp[0],
                    "cpu_modelo": modelo[0],
                    "cpu_no": numNucleos[0],
                    "cpu_cache": tamCache[0],
                    "cpu_load": cpuLoad[0],
                    "storage_info": storageInfo[0],
                }

        return resp

    def create_blob_ssh_key(self, context, name="id_rsa"):
        _logger.info("Creating SSH Key")
        path = self.env["ir.config_parameter"].get_param(
            "se_server_management.ssh_key_store_path"
        )
        path = '/opt/odoo17/server_mangt_odoo/'
        if not os.path.isdir(path):
            try:
                os.makedirs(path)
            except Exception as e:
                UserError(_("Error creando SSH Key : %s" % e))
        temp_pkey = StringIO()
        pkey = False
        if not os.path.isfile(
                os.path.expanduser(path + name + ".pub")
        ):  # in case of a new client without id_rsa.pub we'll try to create it
            try:
                _logger.info("No id_rsa.pub was found on client, creating a new one")
                key = paramiko.RSAKey.generate(1024)
                key.write_private_key(temp_pkey)
                key.write_private_key_file(os.path.join(path + name))
                temp_pkey.seek(0)
                pkey = temp_pkey.read()
                pub = "%s %s" % (key.get_name(), key.get_base64())
                with open(os.path.join(path + name + ".pub"), "w") as f:
                    f.write(pub)
            except Exception as err:
                raise ValidationError(
                    "Error creating SSH Key. Check the permissions for the folder %s . Error: %s" % (path, err))
        pub = open(os.path.join(path + name + ".pub")).read()
        if "user_name" in context:
            _logger.error(
                "RSA key policy is set for Testing connection..." + str(context)
            )
            self.set_key_policy(
                pub,
                context["host"],
                context["user_name"],
                context["password"],
                context["port"],
            )

        else:
            raise ValidationError("Node has no user to test ssh conection")
        return pkey, pub

    def set_key_policy(self, key, host, username, password, port=22):
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            ssh.connect(host, username=username, password=password, port=port, timeout=330)
            ssh.exec_command("mkdir -p ~/.ssh/")
            ssh.exec_command('echo "%s" >> ~/.ssh/authorized_keys' % key)
            ssh.exec_command("chmod 644 ~/.ssh/authorized_keys")
            ssh.exec_command("chmod 700 ~/.ssh/")
            ssh.close()
        except Exception as e:
            _logger.error("ERROR ++++++++++++++++++++++++++++++++++%s" % e)
            raise ValidationError("Error setting key policy: %s" % e)
